import Link from "next/link";
import { SignOutButton } from "@/components/customer/sign-out-button";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return (
      <main className="space-y-4 p-4">
        <h1 className="text-2xl font-semibold">Profil</h1>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="font-medium">Mehmon foydalanuvchi</p>
          <p className="mt-1 text-sm text-zinc-500">Profil va buyurtmalarni ko&apos;rish uchun login qiling.</p>
        </div>
        <div className="grid gap-2">
          <Link href="/login?next=/profile" className="rounded-lg bg-zinc-900 px-4 py-2 text-center text-white">Kirish</Link>
          <Link href="/register?next=/profile" className="rounded-lg border border-zinc-300 px-4 py-2 text-center">Hisob yaratish</Link>
          <Link href="/support" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">Qo&apos;llab-quvvatlash</Link>
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("full_name,phone,role").eq("id", sessionData.session.user.id).single();

  return (
    <main className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Profil</h1>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-500">Ism</p>
        <p className="font-medium">{profile?.full_name ?? "—"}</p>
        <p className="mt-3 text-sm text-zinc-500">Telefon</p>
        <p className="font-medium">{profile?.phone ?? "—"}</p>
        <p className="mt-3 text-sm text-zinc-500">Rol</p>
        <p className="font-medium">{profile?.role ?? "customer"}</p>
      </div>
      <div className="grid gap-2">
        <Link href="/orders" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">Buyurtmalarim</Link>
        <Link href="/home/notifications" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">Bildirishnomalar</Link>
        <Link href="/support" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">Qo&apos;llab-quvvatlash</Link>
      </div>
      <SignOutButton />
    </main>
  );
}
