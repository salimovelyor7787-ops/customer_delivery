import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { type UserRole } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    redirect("/login");
  }

  const { data: userRow } = await supabase
    .from("profiles")
    .select("role,full_name")
    .eq("id", sessionData.session.user.id)
    .single();

  const role = (userRow?.role ?? "courier") as UserRole;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
