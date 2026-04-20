import Link from "next/link";
import { redirect } from "next/navigation";
import { BACKEND_PROFILE_ROLES, pathAfterAuth } from "@/lib/auth-redirect";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { SignOutButton } from "./sign-out-button";

export default async function NoAccessPage() {
  const supabase = await createSupabaseServerClient();
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,full_name")
    .eq("id", sessionData.session.user.id)
    .single();

  const role = profile?.role ?? "customer";

  if (role !== "customer") {
    redirect(pathAfterAuth(role));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Panelga kirish yo'q</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Sizning rolingiz <strong>customer</strong> (mijoz). Bu ilova xodimlar uchun:{" "}
          <strong>admin</strong>, <strong>restaurant</strong>, <strong>courier</strong>.
        </p>
        <p className="mt-3 text-sm text-zinc-600">
          Kerakli bo'limni ochish uchun administrator Supabase-da{" "}
          <code className="rounded bg-zinc-100 px-1">profiles.role</code> maydonini yangilashi kerak.
        </p>
        <p className="mt-4 text-xs text-zinc-500">Ma'lumotlar bazasida ruxsat etilgan qiymatlar: {BACKEND_PROFILE_ROLES.join(", ")}.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <SignOutButton />
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Kirish sahifasiga
          </Link>
        </div>
      </div>
    </main>
  );
}
