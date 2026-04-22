// deno-lint-ignore-file no-explicit-any
import { serve } from "@std/http/server";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData } = await userClient.auth.getUser();
    const actorId = userData.user?.id ?? null;
    if (!actorId) return json({ error: "Unauthorized" }, 401);

    const { data: actorProfile } = await admin.from("profiles").select("role").eq("id", actorId).maybeSingle();
    if (!actorProfile || actorProfile.role !== "restaurant") {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: restaurant } = await admin.from("restaurants").select("id").eq("owner_id", actorId).maybeSingle();
    if (!restaurant?.id) return json({ error: "Restaurant not found" }, 404);

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "").trim();
    const fullName = String(body.full_name ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    if (!email || !password || password.length < 6 || !fullName) {
      return json({ error: "Invalid payload" }, 400);
    }

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (created.error || !created.data.user) {
      const msg = created.error?.message ?? "Could not create courier auth user";
      return json({ error: msg }, 400);
    }

    const courierId = created.data.user.id;

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: courierId,
      role: "courier",
      full_name: fullName,
      phone: phone || null,
    });
    if (profileErr) {
      return json({ error: profileErr.message }, 500);
    }

    const { error: linkErr } = await admin.from("restaurant_couriers").insert({
      restaurant_id: restaurant.id,
      courier_id: courierId,
      login_email: email,
      active: true,
    });
    if (linkErr) {
      return json({ error: linkErr.message }, 500);
    }

    return json({
      courier_id: courierId,
      email,
      full_name: fullName,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Server error" }, 500);
  }
});
