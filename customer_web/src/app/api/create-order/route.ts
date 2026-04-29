import { NextResponse } from "next/server";
import { createOrderDirect, isEdgeFunctionNotFound, type CreateOrderBody } from "@/lib/server/create-order-impl";
import { redis } from "@/lib/redis";
import { enforceIpRateLimit } from "@/lib/server/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Proxies checkout to Supabase Edge Function on the same origin as the site.
 * Avoids browser → *.supabase.co failures (ad blockers, strict mobile networks).
 */
export async function POST(req: Request) {
  const startedAt = Date.now();
  const traceId = `co-${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
  let stage = "init";
  let sessionMs = 0;
  let directMs = 0;
  let edgeMs = 0;
  let dbMs = 0;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    console.error("[create-order]", { traceId, stage, error: "missing_supabase_env" });
    return NextResponse.json({ error: "Server misconfigured: missing Supabase env" }, { status: 500 });
  }

  const allowed = await enforceIpRateLimit(req, "rl:create-order", 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    stage = "parse_json";
    body = await req.json();
  } catch {
    console.warn("[create-order]", { traceId, stage, error: "invalid_json" });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = body as Partial<CreateOrderBody> & { request_id?: string | null };
  const requestId = typeof payload.request_id === "string" ? payload.request_id.trim() : "";
  const idemKey = requestId ? `order:${requestId}` : null;
  let idemLocked = false;
  if (redis && idemKey) {
    try {
      const acquired = await redis.set(idemKey, "processing", { ex: 120, nx: true });
      if (!acquired) {
        const existing = await redis.get(idemKey);
        if (typeof existing === "string" && existing.startsWith("ok:")) {
          const orderId = existing.slice(3);
          if (orderId) {
            return NextResponse.json({ order_id: orderId }, { status: 200 });
          }
        }
        return NextResponse.json({ error: "Duplicate request" }, { status: 409 });
      }
      idemLocked = true;
    } catch {
      // If Redis is unavailable, continue without idempotency guard.
    }
  }

  const supabase = await createSupabaseServerClient();
  stage = "resolve_session";
  const sessionStartedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  sessionMs = Date.now() - sessionStartedAt;
  // Do not trust incoming Authorization header from browsers/proxies.
  // Some environments inject non-Supabase JWTs (e.g. ES256), which breaks
  // Supabase auth checks for create_order.
  const accessToken = session?.access_token ?? anonKey;

  const base = supabaseUrl.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Prefer server-side direct flow when service key is available, so checkout logic
  // stays in sync with repository code and does not depend on edge deployment lag.
  if (serviceKey) {
    stage = "direct_rpc";
    const directStartedAt = Date.now();
    const direct = await createOrderDirect({
      supabaseUrl: base,
      anonKey,
      serviceRoleKey: serviceKey,
      authorizationHeader: `Bearer ${accessToken}`,
      body: body as CreateOrderBody,
    });
    directMs = Date.now() - directStartedAt;
    dbMs = directMs;
    const totalMs = Date.now() - startedAt;
    if (direct.ok) {
      if (redis && idemKey) {
        try {
          await redis.set(idemKey, `ok:${direct.order_id}`, { ex: 120 });
        } catch {
          // Ignore Redis write errors.
        }
      }
      console.info("[create-order]", { traceId, mode: "direct", status: 200, sessionMs, dbMs, directMs, totalMs });
      return NextResponse.json({ order_id: direct.order_id }, { status: 200 });
    }
    if (redis && idemKey && idemLocked) {
      try {
        await redis.del(idemKey);
      } catch {
        // Ignore Redis delete errors.
      }
    }
    console.warn("[create-order]", {
      traceId,
      mode: "direct",
      status: direct.status,
      sessionMs,
      dbMs,
      directMs,
      totalMs,
      body: direct.body,
    });
    return NextResponse.json(direct.body, { status: direct.status });
  }

  const upstreamUrl = `${base}/functions/v1/create_order`;

  const ac = new AbortController();
  const timeoutMs = 20_000;
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  let upstream: Response;
  try {
    stage = "edge_fetch";
    const edgeStartedAt = Date.now();
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    edgeMs = Date.now() - edgeStartedAt;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream fetch failed";
    const aborted = e instanceof Error && e.name === "AbortError";
    if (redis && idemKey && idemLocked) {
      try {
        await redis.del(idemKey);
      } catch {
        // Ignore Redis delete errors.
      }
    }
    const totalMs = Date.now() - startedAt;
    console.error("[create-order]", {
      traceId,
      stage,
      mode: "edge",
      status: aborted ? 504 : 502,
      sessionMs,
      dbMs,
      edgeMs,
      totalMs,
      error: message,
    });
    return NextResponse.json({ error: aborted ? "Checkout timeout, please retry" : message }, { status: aborted ? 504 : 502 });
  } finally {
    clearTimeout(timer);
  }

  const text = await upstream.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { error: text.slice(0, 200) || "Edge function returned non-JSON" };
  }

  if (
    upstream.ok &&
    parsed &&
    typeof parsed === "object" &&
    "order_id" in parsed &&
    typeof (parsed as { order_id: unknown }).order_id === "string"
  ) {
    dbMs = edgeMs;
    if (redis && idemKey) {
      try {
        await redis.set(idemKey, `ok:${(parsed as { order_id: string }).order_id}`, { ex: 120 });
      } catch {
        // Ignore Redis write errors.
      }
    }
    const totalMs = Date.now() - startedAt;
    console.info("[create-order]", {
      traceId,
      mode: "edge",
      status: upstream.status,
      sessionMs,
      dbMs,
      edgeMs,
      totalMs,
    });
    return NextResponse.json(parsed, { status: upstream.status });
  }

  if (isEdgeFunctionNotFound(upstream.status, text, parsed)) {
    dbMs = edgeMs;
    if (redis && idemKey && idemLocked) {
      try {
        await redis.del(idemKey);
      } catch {
        // Ignore Redis delete errors.
      }
    }
    const totalMs = Date.now() - startedAt;
    console.warn("[create-order]", {
      traceId,
      mode: "edge",
      status: 503,
      sessionMs,
      dbMs,
      edgeMs,
      totalMs,
      error: "edge_function_not_found",
    });
    return NextResponse.json(
      {
        error:
          "Edge Function create_order topilmadi. Variantlar: (1) Supabase → Edge Functions → create_order ni deploy qiling; yoki (2) Vercel → Environment → SUPABASE_SERVICE_ROLE_KEY qo'shing (faqat server, NEXT_PUBLIC emas).",
      },
      { status: 503 },
    );
  }

  const totalMs = Date.now() - startedAt;
  dbMs = edgeMs;
  if (redis && idemKey && idemLocked) {
    try {
      await redis.del(idemKey);
    } catch {
      // Ignore Redis delete errors.
    }
  }

  console.warn("[create-order]", {
    traceId,
    mode: "edge",
    status: upstream.status,
    sessionMs,
    dbMs,
    edgeMs,
    totalMs,
    response: parsed,
  });
  return NextResponse.json(parsed, { status: upstream.status });
}
