"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Xatolik yuz berdi</h1>
        <p className="mt-2 text-sm text-zinc-600">Sahifa yuklanmadi. Qayta urinib ko&apos;ring.</p>
        <button type="button" onClick={reset} className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Qayta urinish
        </button>
      </div>
    </main>
  );
}
