"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, PlusSquare, Share2, Smartphone, X } from "lucide-react";
import toast from "react-hot-toast";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome") && !ua.includes("android");
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.toLowerCase().includes("android");
}

const HIDE_HOME_BANNER_KEY = "pwa_install_home_hidden_until";
const HIDE_HOME_DAYS = 7;

type PwaInstallCardProps = {
  variant?: "card" | "banner";
};

export function PwaInstallCard({ variant = "card" }: PwaInstallCardProps) {
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const ios = useMemo(() => isIosDevice(), []);
  const android = useMemo(() => isAndroidDevice(), []);
  const safari = useMemo(() => isSafariBrowser(), []);
  const playStoreUrl = process.env.NEXT_PUBLIC_ANDROID_APP_URL?.trim() ?? "";

  useEffect(() => {
    setInstalled(isStandaloneMode());
    if (variant === "banner" && typeof window !== "undefined") {
      const raw = window.localStorage.getItem(HIDE_HOME_BANNER_KEY);
      const until = raw ? Number(raw) : 0;
      if (Number.isFinite(until) && until > Date.now()) {
        setDismissed(true);
      }
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowIosGuide(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [variant]);

  if (installed || dismissed) return null;

  const onInstall = async () => {
    if (android && playStoreUrl) {
      window.location.href = playStoreUrl;
      return;
    }

    if (ios) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      toast("Brauzeringizda o'rnatish oynasi hozircha mavjud emas.");
      return;
    }

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Ilova o'rnatish boshlandi.");
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const hideBannerTemporarily = () => {
    const until = Date.now() + HIDE_HOME_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(HIDE_HOME_BANNER_KEY, String(until));
    setDismissed(true);
  };

  const actionLabel = android && playStoreUrl ? "Play Market" : "Yuklab olish";

  return (
    <>
      {variant === "banner" ? (
        <section className="rounded-2xl bg-orange-50/70 p-2.5 ring-1 ring-orange-100">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900">{"Ilovani o'rnating"}</p>
            </div>
            <button
              type="button"
              onClick={() => void onInstall()}
              disabled={installing}
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              {installing ? "Kutilmoqda..." : actionLabel}
            </button>
            <button type="button" onClick={hideBannerTemporarily} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100" aria-label="Yopish">
              <X className="h-4 w-4" />
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-50 p-2 text-orange-500">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-900">{"Ilovani o'rnating"}</p>
            </div>
            <button
              type="button"
              onClick={() => void onInstall()}
              disabled={installing}
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {installing ? "Kutilmoqda..." : actionLabel}
            </button>
          </div>
        </section>
      )}

      {showIosGuide ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900">Ilovani o&apos;rnatish</h2>
                <p className="mt-1 text-sm text-zinc-600">Ilovani bosh ekranga qo&apos;shing va tezroq foydalaning.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100"
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
              <p className="text-base font-semibold text-zinc-900">Bir necha qadamda o&apos;rnating</p>
              <p className="mt-1 text-sm text-zinc-600">Quyidagi amallarni bajaring:</p>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                      1
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">Pastdagi ulashish tugmasini bosing</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        Safari pastki panelidagi <span className="font-medium">Share</span> tugmasini bosing.
                      </p>
                    </div>
                    <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                      2
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">&quot;Bosh ekranga qo&apos;shish&quot; bandini tanlang</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        Ochilgan ro&apos;yxatdan <span className="font-medium">Add to Home Screen</span> ni topib bosing.
                      </p>
                    </div>
                    <PlusSquare className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                      3
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">&quot;Qo&apos;shish&quot; tugmasini bosing</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        O&apos;ng yuqoridagi <span className="font-medium">Qo&apos;shish (Add)</span> tugmasini bosib yakunlang.
                      </p>
                    </div>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  </div>
                </div>
              </div>

              {!safari ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Ushbu amallar faqat Safari ichida ko&apos;rinadi. Iltimos, sahifani Safari brauzerida oching.
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3">
              <p className="text-sm font-semibold text-violet-900">Tayyor!</p>
              <p className="mt-1 text-sm text-violet-900/90">
                Ilova belgisi bosh ekranda paydo bo&apos;ladi va keyingi safar bir bosishda ochiladi.
              </p>
            </div>

            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setShowIosGuide(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">
                Tushunarli
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

