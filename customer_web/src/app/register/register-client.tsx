"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { pathAfterAuth } from "@/lib/auth-redirect";

export function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const phoneDigits = phone.replace(/\D/g, "").slice(0, 9);
  const normalizedPhone = phoneDigits.length === 9 ? `+998${phoneDigits}` : "";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) return toast.error("Parollar mos kelmaydi");
    if (password.length < 6) return toast.error("Parol kamida 6 belgidan iborat bo'lsin");
    if (phoneDigits.length > 0 && phoneDigits.length !== 9) return toast.error("Telefon 9 xonali bo'lishi kerak");
    const supabase = createSupabaseBrowserClient();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim(), phone: normalizedPhone || undefined } },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (!data.user) {
      toast.error("Ro'yxatdan o'tish muvaffaqiyatsiz");
      setLoading(false);
      return;
    }
    if (normalizedPhone && data.session) {
      await supabase.from("profiles").update({ phone: normalizedPhone }).eq("id", data.user.id);
    }
    if (data.session) {
      const next = searchParams.get("next");
      toast.success("Hisob yaratildi");
      router.push(next && next.startsWith("/") ? next : pathAfterAuth());
      router.refresh();
      return;
    }
    toast.success("Emailni tasdiqlang, so'ng kirish sahifasiga o'ting");
    const next = searchParams.get("next");
    router.push(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
    setLoading(false);
  };

  const nextParam = searchParams.get("next");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Ro&apos;yxatdan o&apos;tish</h1>
        <p className="mt-2 text-sm text-zinc-500">Mijoz hisobini yarating va buyurtma berishni boshlang.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block"><span className="mb-1 block text-sm text-zinc-600">Ism</span><input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900" autoComplete="name" /></label>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-600">Telefon (ixtiyoriy)</span>
            <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white focus-within:border-zinc-900">
              <span className="border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">+998</span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={phoneDigits}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="901234567"
                className="w-full px-3 py-2 outline-none"
                autoComplete="tel-national"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">9 ta raqam kiriting</p>
          </label>
          <label className="block"><span className="mb-1 block text-sm text-zinc-600">Email</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900" autoComplete="email" /></label>
          <label className="block"><span className="mb-1 block text-sm text-zinc-600">Parol</span><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900" autoComplete="new-password" /></label>
          <label className="block"><span className="mb-1 block text-sm text-zinc-600">Parolni takrorlang</span><input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900" autoComplete="new-password" /></label>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60">{loading ? "Ro'yxatdan o'tilmoqda…" : "Hisob yaratish"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-600">
          Hisobingiz bormi?{" "}
          <Link href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"} className="font-medium text-zinc-900 underline">
            Kirish
          </Link>
        </p>
      </div>
    </main>
  );
}
