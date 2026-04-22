"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { pathAfterAuth } from "@/lib/auth-redirect";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
    const next = searchParams.get("next");
    toast.success("Xush kelibsiz");
    router.push(next && next.startsWith("/") ? next : pathAfterAuth());
    router.refresh();
  };

  const nextParam = searchParams.get("next");
  const nextPath = nextParam && nextParam.startsWith("/") ? nextParam : pathAfterAuth();

  const onGoogleSignIn = async () => {
    const supabase = createSupabaseBrowserClient();
    setGoogleLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        toast.error(error.message);
        setGoogleLoading(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google orqali kirish muvaffaqiyatsiz");
      setGoogleLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Kirish</h1>
        <p className="mt-2 text-sm text-zinc-500">Buyurtmalar, profil va tarixni ko&apos;rish uchun tizimga kiring.</p>
        <button
          type="button"
          onClick={onGoogleSignIn}
          disabled={loading || googleLoading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-60"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold">G</span>
          {googleLoading ? "Google bilan kirilmoqda…" : "Google bilan kirish"}
        </button>
        <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
          <span className="h-px flex-1 bg-zinc-200" />
          yoki
          <span className="h-px flex-1 bg-zinc-200" />
        </div>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-600">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900" autoComplete="email" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-600">Parol</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900" autoComplete="current-password" />
          </label>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60">
            {loading ? "Kirilmoqda…" : "Kirish"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-600">
          Hisobingiz yo&apos;qmi?{" "}
          <Link href={nextParam ? `/register?next=${encodeURIComponent(nextParam)}` : "/register"} className="font-medium text-zinc-900 underline">
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </p>
      </div>
    </main>
  );
}
