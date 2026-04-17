import { NextResponse } from "next/server";
import { isLikelyJwt } from "@/lib/edge-function-error";
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

  const clientAuth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  let bearerFromClient: string | null = null;
  if (clientAuth?.startsWith("Bearer ")) {
    const raw = clientAuth.slice(7).trim();
    if (isLikelyJwt(raw)) bearerFromClient = raw;
  }

  const accessToken = bearerFromClient ?? session?.access_token ?? anonKey;

  const base = supabaseUrl.replace(/\/$/, "");
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

  return NextResponse.json(parsed, { status: upstream.status });
}
