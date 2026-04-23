import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterClient } from "./register-client";

export const metadata: Metadata = {
  title: "Ro'yxatdan o'tish",
  description: "Minutka Biznes uchun yangi akkaunt yaratish sahifasi.",
  alternates: {
    canonical: "/register",
  },
};

function RegisterFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-pulse rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="h-8 w-52 rounded bg-zinc-100" />
        <div className="mt-3 h-4 w-full rounded bg-zinc-100" />
        <div className="mt-8 space-y-4">
          <div className="h-10 w-full rounded-lg bg-zinc-100" />
          <div className="h-10 w-full rounded-lg bg-zinc-100" />
          <div className="h-10 w-full rounded-lg bg-zinc-100" />
          <div className="h-10 w-full rounded-lg bg-zinc-100" />
          <div className="h-10 w-full rounded-lg bg-zinc-200" />
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterClient />
    </Suspense>
  );
}
