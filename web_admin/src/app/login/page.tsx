"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { pathAfterAuth } from "@/lib/auth-redirect";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      toast.error(error?.message ?? "Kirish muvaffaqiyatsiz");
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

    toast.success("Xush kelibsiz");
    router.push(pathAfterAuth(profile.role));
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Kirish</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Panel <strong>admin</strong>, <strong>restaurant</strong> va <strong>courier</strong> rollari uchun. Ro&apos;yxatdan
          o&apos;tgach avvalo <strong>customer</strong> roli beriladi — panelga kirishni administrator beradi.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-600">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
              autoComplete="email"
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
          Hisobingiz yo&apos;qmi?{" "}
          <Link href="/register" className="font-medium text-zinc-900 underline">
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </p>
      </div>
    </main>
  );
}
