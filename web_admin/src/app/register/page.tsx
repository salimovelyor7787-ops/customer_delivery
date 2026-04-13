"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { pathAfterAuth } from "@/lib/auth-redirect";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      toast.error("Пароль не короче 6 символов");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim() || undefined,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      toast.error("Регистрация не удалась");
      setLoading(false);
      return;
    }

    if (phone.trim() && data.session) {
      await supabase.from("profiles").update({ phone: phone.trim() }).eq("id", data.user.id);
    }

    if (data.session) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      const role = profile?.role ?? "customer";
      toast.success("Аккаунт создан");
      router.push(pathAfterAuth(role));
      router.refresh();
      return;
    }

    toast.success("Проверьте почту и подтвердите email, затем войдите");
    router.push("/login");
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Регистрация</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Новый пользователь получает роль <strong>customer</strong> (клиент). Доступ к панелям admin / restaurant / courier выдаёт
          администратор в Supabase.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-600">Имя</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-600">Телефон (необязательно)</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
              autoComplete="tel"
            />
          </label>

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
            <span className="mb-1 block text-sm text-zinc-600">Пароль</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-600">Повтор пароля</span>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
              autoComplete="new-password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {loading ? "Регистрация…" : "Создать аккаунт"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}
