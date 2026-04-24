import { redirect } from "next/navigation";
import { pathAfterAuth } from "@/lib/auth-redirect";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function Home() {
  try {
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

    redirect(pathAfterAuth(userRow?.role ?? "customer"));
  } catch (error) {
    console.error("home page bootstrap failed", error);
    redirect("/login");
  }
}
