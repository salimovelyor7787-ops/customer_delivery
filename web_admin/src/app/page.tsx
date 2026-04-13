import { redirect } from "next/navigation";
import { roleHomePath } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    redirect("/login");
  }

  const { data: userRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", sessionData.session.user.id)
    .single();

  redirect(roleHomePath((userRow?.role ?? "courier") as "admin" | "restaurant" | "courier"));
}
