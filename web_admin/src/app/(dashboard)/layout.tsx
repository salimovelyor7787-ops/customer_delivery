import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { type UserRole } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try {
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

    const rawRole = userRow?.role ?? "customer";
    if (rawRole === "customer") {
      redirect("/no-access");
    }
    const role = rawRole as UserRole;

    return <DashboardShell role={role}>{children}</DashboardShell>;
  } catch (error) {
    console.error("dashboard layout bootstrap failed", error);
    redirect("/login");
  }
}
