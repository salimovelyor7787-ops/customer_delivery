"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type TelegramLinkState = {
  restaurant: { id: string; name: string };
  linkedTelegramUserId: number | null;
  activeCode: string | null;
  activeCodeExpiresAt: string | null;
};

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "chust_minutkauz_bot";

export default function RestaurantTelegramPage() {
  const [state, setState] = useState<TelegramLinkState | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadState = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/restaurant/telegram/link-code");
    const payload = (await response.json().catch(() => ({}))) as TelegramLinkState & { error?: string };
    setLoading(false);
    if (!response.ok) {
      toast.error(payload.error ?? "Telegram holatini olishda xatolik.");
      return;
    }
    setState(payload);
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const createCode = async () => {
    setCreating(true);
    const response = await fetch("/api/restaurant/telegram/link-code", { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { code?: string; expiresAt?: string; error?: string };
    setCreating(false);
    if (!response.ok || !payload.code) {
      toast.error(payload.error ?? "Kod yaratilmadi.");
      return;
    }
    toast.success("Yangi kod yaratildi.");
    await loadState();
  };

  const startCommand = useMemo(() => (state?.activeCode ? `/start ${state.activeCode}` : "/start"), [state?.activeCode]);
  const botDeepLink = useMemo(
    () => (state?.activeCode ? `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(state.activeCode)}` : `https://t.me/${BOT_USERNAME}`),
    [state?.activeCode],
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Telegram ulash</h1>
        <p className="text-sm text-zinc-500">Telegram botni faqat o'zingizning restoraningizga bog'lash uchun bir martalik koddan foydalaning.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        {loading || !state ? (
          <p className="text-sm text-zinc-500">Yuklanmoqda...</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              Restoran: <span className="font-medium">{state.restaurant.name}</span>
            </p>
            <p className="text-sm">
              Holat:{" "}
              <span className={`font-medium ${state.linkedTelegramUserId ? "text-green-700" : "text-amber-700"}`}>
                {state.linkedTelegramUserId ? `Ulangan (Telegram ID: ${state.linkedTelegramUserId})` : "Hali ulanmagan"}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void createCode()}
                disabled={creating}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {creating ? "Yaratilmoqda..." : "Bir martalik kod yaratish"}
              </button>
              <a
                href={botDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Telegram botni ochish
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">Qanday ulash kerak:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>"Bir martalik kod yaratish" tugmasini bosing.</li>
          <li>Telegram botga private chatda quyidagi komandani yuboring:</li>
        </ol>
        <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-100 px-3 py-2 text-xs">{startCommand}</pre>
        <p className="mt-2">So'ng botni guruhga qo'shib, guruh admini sifatida <code>/setup</code> buyrug'ini yuboring.</p>
      </div>
    </section>
  );
}
