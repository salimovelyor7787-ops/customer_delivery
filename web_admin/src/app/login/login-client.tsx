"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { pathAfterAuth } from "@/lib/auth-redirect";

const LOGIN_EMAIL_DOMAIN = "minut-ka.uz";

function normalizeLoginToEmail(loginOrEmail: string): string {
  const value = loginOrEmail.trim().toLowerCase();
  if (!value) return value;
  if (value.includes("@")) return value;
  return `${value}@${LOGIN_EMAIL_DOMAIN}`;
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginOrEmail, setLoginOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    setLoading(true);
    const email = normalizeLoginToEmail(loginOrEmail);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      toast.error(error?.message ?? "Login/Email yoki parol noto'g'ri");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile?.role) {
      toast.error("Profil topilmadi");
      setLoading(false);
      return;
    }

    const next = searchParams.get("next");
    toast.success("Xush kelibsiz");
    router.push(next && next.startsWith("/") ? next : pathAfterAuth(profile.role));
    router.refresh();
  };

  const nextParam = searchParams.get("next");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/minutka-logo.png" alt="Minutka logo" className="h-14 w-14 rounded-xl object-cover ring-1 ring-orange-200" />
          <h2 className="mt-3 text-xl font-semibold text-zinc-900">Minutka-biznes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Bizni tanlaganingiz uchun rahmat. Birgalikda biznesingizni yanada kuchliroq rivojlantiramiz.
          </p>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Kirish</h1>
        <p className="mt-2 text-sm text-zinc-500">Buyurtmalar, profil va tarixni ko'rish uchun tizimga kiring.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-600">Login yoki Email</span>
            <input
              type="text"
              required
              value={loginOrEmail}
              onChange={(e) => setLoginOrEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-600">Parol</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {loading ? "Kirilmoqda…" : "Kirish"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600">
          Hisobingiz yo'qmi?{" "}
          <Link href={nextParam ? `/register?next=${encodeURIComponent(nextParam)}` : "/register"} className="font-medium text-zinc-900 underline">
            Ro'yxatdan o'tish
          </Link>
        </p>
      </div>
    </main>
  );
}
