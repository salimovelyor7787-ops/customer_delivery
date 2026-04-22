import Link from "next/link";
import { Bell, ChevronRight, CircleHelp, Gift, MapPin, Settings, UserRound } from "lucide-react";
import { InviteShareButton } from "@/components/customer/invite-share-button";
import { PwaInstallCard } from "@/components/customer/pwa-install-card";
import { SignOutButton } from "@/components/customer/sign-out-button";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const isGuest = !sessionData.session;
  const sessionUser = sessionData.session?.user ?? null;

  const { data: profile } = isGuest
    ? { data: null as { full_name: string | null; phone: string | null; role: string | null } | null }
    : await supabase.from("profiles").select("full_name,phone,role").eq("id", sessionData.session.user.id).single();

  const displayName =
    profile?.full_name?.trim() ||
    (typeof sessionUser?.user_metadata?.full_name === "string" ? sessionUser.user_metadata.full_name.trim() : "") ||
    (typeof sessionUser?.user_metadata?.name === "string" ? sessionUser.user_metadata.name.trim() : "") ||
    sessionUser?.email?.trim() ||
    (isGuest ? "Mehmon foydalanuvchi" : "Foydalanuvchi");

  return (
    <main className="space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Profil</h1>
        <button type="button" className="rounded-full p-2 text-zinc-700">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <Link
        href={isGuest ? "/login?next=/profile" : "/profile"}
        className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
          <UserRound className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold text-zinc-900">{displayName}</p>
          <p className="truncate text-sm text-zinc-500">
            {isGuest
              ? "Profil va manzillar uchun tizimga kiring"
              : profile?.phone?.trim() || "Profil ma'lumotlari"}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-400" />
      </Link>

      <section className="rounded-2xl bg-orange-50/60 px-4 py-3 ring-1 ring-orange-100">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white p-2 text-orange-500 ring-1 ring-orange-100">
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-zinc-900">Do&apos;stlaringizni taklif qiling</p>
            <p className="text-sm text-zinc-500">Bonus va chegirmalar oling!</p>
          </div>
          <InviteShareButton inviteCode={sessionData.session?.user.id ?? null} />
        </div>
      </section>

      <PwaInstallCard />

      <section className="space-y-3">
        <h2 className="text-3xl font-semibold">Yordam va profil</h2>
        <div className="space-y-1 rounded-2xl bg-white p-2 ring-1 ring-zinc-200">
          <ProfileLink href="/support" icon={<CircleHelp className="h-5 w-5" />} title="Qo&apos;llab-quvvatlash chati" subtitle="Yordam va savollar" />
          <ProfileLink href={isGuest ? "/login?next=/profile" : "/profile"} icon={<MapPin className="h-5 w-5" />} title="Mening manzillarim" subtitle="Saqlangan manzillar" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-3xl font-semibold">Sozlamalar</h2>
        <div className="space-y-1 rounded-2xl bg-white p-2 ring-1 ring-zinc-200">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="rounded-lg bg-orange-50 p-2 text-orange-500">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">Bildirishnomalar</p>
              <p className="text-sm text-zinc-500">Push xabarlarni boshqarish</p>
            </div>
            <span className="inline-flex h-7 w-12 items-center rounded-full bg-orange-500 p-1">
              <span className="ml-auto h-5 w-5 rounded-full bg-white" />
            </span>
          </div>
          <ProfileLink href="/support" icon={<CircleHelp className="h-5 w-5" />} title="Ilova haqida" subtitle="Versiya 1.0.0" />
        </div>
      </section>

      {isGuest ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/login?next=/profile" className="rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-white">
            Kirish
          </Link>
          <Link href="/register?next=/profile" className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-center">
            Hisob yaratish
          </Link>
        </div>
      ) : (
        <div>
          <SignOutButton />
        </div>
      )}
    </main>
  );
}

function ProfileLink({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-zinc-50">
      <div className="rounded-lg bg-orange-50 p-2 text-orange-500">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900">{title}</p>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-zinc-400" />
    </Link>
  );
}
