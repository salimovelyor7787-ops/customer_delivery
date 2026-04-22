"use client";

import { useMemo, useState } from "react";

type InviteShareButtonProps = {
  inviteCode?: string | null;
};

export function InviteShareButton({ inviteCode }: InviteShareButtonProps) {
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteUrl = useMemo(() => {
    const basePath = inviteCode ? `/register?ref=${encodeURIComponent(inviteCode)}` : "/register";
    if (typeof window === "undefined") return basePath;
    return `${window.location.origin}${basePath}`;
  }, [inviteCode]);

  const handleShare = async () => {
    const shareData = {
      title: "Dostavka App",
      text: "Buyurtma berish uchun ilovani sinab ko'ring!",
      url: inviteUrl,
    };

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // If the user cancels or share fails, fallback keeps the flow usable.
      }
    }

    setFallbackOpen(true);
  };

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <button type="button" onClick={handleShare} className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white">
        Taklif qilish
      </button>

      {fallbackOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Do&apos;stga ulashish</h3>
            <p className="mt-1 text-sm text-zinc-600">Havolani yuboring yoki nusxa oling.</p>
            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 break-all">{inviteUrl}</div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setFallbackOpen(false)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
              >
                Yopish
              </button>
              <button type="button" onClick={handleCopy} className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white">
                {copied ? "Nusxalandi" : "Nusxa olish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
