"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  console.error(error);

  return (
    <html lang="uz">
      <body className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-900">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Kutilmagan xatolik</h1>
          <p className="mt-2 text-sm text-zinc-600">Ilovada kutilmagan muammo yuz berdi.</p>
          <button type="button" onClick={reset} className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
            Sahifani tiklash
          </button>
        </div>
      </body>
    </html>
  );
}
