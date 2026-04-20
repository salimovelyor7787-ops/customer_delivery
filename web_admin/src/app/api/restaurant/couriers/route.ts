import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type CreateCourierBody = {
  fullName?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CreateCourierBody | null;
  const fullName = body?.fullName?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if (!fullName || !email || password.length < 6) {
    return NextResponse.json({ error: "F.I.O, email va kamida 6 belgili parol kerak." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "restaurant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Server env is not configured (SUPABASE_SERVICE_ROLE_KEY)." }, { status: 500 });
  }

  const admin = createClient(url, serviceRoleKey);
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (created.error || !created.data.user) {
    return NextResponse.json({ error: created.error?.message ?? "Failed to create courier user." }, { status: 400 });
  }

  const courierId = created.data.user.id;

  const [profileUpsert, relationUpsert] = await Promise.all([
    admin.from("profiles").upsert(
      {
        id: courierId,
        role: "courier",
        full_name: fullName,
      },
      { onConflict: "id" },
    ),
    admin.from("restaurant_couriers").upsert(
      {
        restaurant_id: restaurant.id,
        courier_id: courierId,
      },
      { onConflict: "restaurant_id,courier_id" },
    ),
  ]);

  if (profileUpsert.error || relationUpsert.error) {
    return NextResponse.json({ error: profileUpsert.error?.message ?? relationUpsert.error?.message ?? "Failed to link courier." }, { status: 400 });
  }

  return NextResponse.json({
    courier: {
      id: courierId,
      full_name: fullName,
      email,
    },
  });
}
