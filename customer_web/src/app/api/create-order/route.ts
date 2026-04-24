import { NextResponse } from "next/server";
import { createOrderDirect, isEdgeFunctionNotFound, type CreateOrderBody } from "@/lib/server/create-order-impl";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Proxies checkout to Supabase Edge Function on the same origin as the site.
 * Avoids browser → *.supabase.co failures (ad blockers, strict mobile networks).
 */
export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Server misconfigured: missing Supabase env" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  // Do not trust incoming Authorization header from browsers/proxies.
  // Some environments inject non-Supabase JWTs (e.g. ES256), which breaks
  // Supabase auth checks for create_order.
  const accessToken = session?.access_token ?? anonKey;

  const base = supabaseUrl.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Prefer server-side direct flow when service key is available, so checkout logic
  // stays in sync with repository code and does not depend on edge deployment lag.
  if (serviceKey) {
    const direct = await createOrderDirect({
      supabaseUrl: base,
      anonKey,
      serviceRoleKey: serviceKey,
      authorizationHeader: `Bearer ${accessToken}`,
      body: body as CreateOrderBody,
    });
    if (direct.ok) {
      return NextResponse.json({ order_id: direct.order_id }, { status: 200 });
    }
    return NextResponse.json(direct.body, { status: direct.status });
  }

  const upstreamUrl = `${base}/functions/v1/create_order`;

  const ac = new AbortController();
  const timeoutMs = 60_000;
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  let upstream: Response;
  try {
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
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
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
    return NextResponse.json(parsed, { status: upstream.status });
  }

  if (isEdgeFunctionNotFound(upstream.status, text, parsed)) {
    return NextResponse.json(
      {
        error:
          "Edge Function create_order topilmadi. Variantlar: (1) Supabase → Edge Functions → create_order ni deploy qiling; yoki (2) Vercel → Environment → SUPABASE_SERVICE_ROLE_KEY qo'shing (faqat server, NEXT_PUBLIC emas).",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(parsed, { status: upstream.status });
}
