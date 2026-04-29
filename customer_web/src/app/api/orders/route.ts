import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type CursorPayload = {
  created_at: string;
  id: string;
};

function parseLimit(raw: string | null): number {
  const value = Number(raw ?? 20);
  if (!Number.isFinite(value)) return 20;
  if (value < 10) return 10;
  if (value > 20) return 20;
  return Math.floor(value);
}

function decodeCursor(raw: string | null): CursorPayload | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<CursorPayload>;
    if (typeof parsed.created_at !== "string" || typeof parsed.id !== "string") return null;
    return { created_at: parsed.created_at, id: parsed.id };
  } catch {
    return null;
  }
}

function encodeCursor(row: { created_at: string; id: string } | null): string | null {
  if (!row) return null;
  const payload = JSON.stringify({ created_at: row.created_at, id: row.id } satisfies CursorPayload);
  return Buffer.from(payload, "utf8").toString("base64url");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const cursor = decodeCursor(url.searchParams.get("cursor"));

    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("orders")
      .select("id,status,total_cents,created_at,restaurants(name)")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (cursor) {
      // Cursor uses created_at primarily; id is carried for future tie-break upgrades.
      query = query.lt("created_at", cursor.created_at);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Could not load orders" }, { status: 500 });
    }

    const rows = (data ?? []) as Array<{
      id: string;
      status: string;
      total_cents: number;
      created_at: string;
      restaurants: { name: string } | { name: string }[] | null;
    }>;

    const nextCursor = rows.length === limit ? encodeCursor(rows[rows.length - 1] ?? null) : null;
    return NextResponse.json({ data: rows, nextCursor });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
