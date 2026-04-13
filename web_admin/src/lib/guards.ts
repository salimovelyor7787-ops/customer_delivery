import { redirect } from "next/navigation";
import { roleHomePath, type UserRole } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function requireRole(allowed: UserRole[]) {
  const supabase = await createSupabaseServerClient();
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    redirect("/login");
  }

  const { data: row } = await supabase
    .from("profiles")
    .select("id,role,full_name")
    .eq("id", sessionData.session.user.id)
    .single();

  const role = (row?.role ?? "courier") as UserRole;
  if (!allowed.includes(role)) {
    redirect(roleHomePath(role));
  }

  return { supabase, user: row, role };
}
