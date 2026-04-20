import { redirect } from "next/navigation";
import { pathAfterAuth } from "@/lib/auth-redirect";
import { type UserRole } from "@/lib/supabase";
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

  const role = row?.role ?? "customer";
  if (!(allowed as readonly string[]).includes(role)) {
    redirect(pathAfterAuth(role));
  }

  return { supabase, user: row, role: role as UserRole, sessionUserId: sessionData.session.user.id };
}
