import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function generateLinkCode() {
  return `TG${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

async function requireRestaurantOwner() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Auth required" }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "restaurant") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const { data: restaurant } = await supabase.from("restaurants").select("id,name").eq("owner_id", user.id).single();
  if (!restaurant) {
    return { error: NextResponse.json({ error: "Restaurant not found" }, { status: 404 }) };
  }

  return { user, restaurant };
}

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Server env is not configured (SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createClient(url, serviceRoleKey);
}

export async function GET() {
  const owner = await requireRestaurantOwner();
  if ("error" in owner) return owner.error;

  try {
    const admin = createServiceRoleClient();
    const [{ data: link }, { data: code }] = await Promise.all([
      admin
        .from("telegram_users")
        .select("telegram_user_id,updated_at")
        .eq("owner_id", owner.user.id)
        .maybeSingle(),
      admin
        .from("telegram_link_codes")
        .select("code,expires_at,used_at,created_at")
        .eq("owner_id", owner.user.id)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      restaurant: owner.restaurant,
      linkedTelegramUserId: link?.telegram_user_id ?? null,
      activeCode: code?.code ?? null,
      activeCodeExpiresAt: code?.expires_at ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 },
    );
  }
}

export async function POST() {
  const owner = await requireRestaurantOwner();
  if ("error" in owner) return owner.error;

  try {
    const admin = createServiceRoleClient();
    const code = generateLinkCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { error } = await admin.from("telegram_link_codes").insert({
      owner_id: owner.user.id,
      code,
      expires_at: expiresAt,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      code,
      expiresAt,
      deepLinkInstruction: `/start ${code}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 },
    );
  }
}
