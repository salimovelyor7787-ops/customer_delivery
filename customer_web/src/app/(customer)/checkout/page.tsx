"use client";

import { FormEvent, useRef, useState } from "react";
import { ArrowLeft, MapPin, Phone, Shield, ShoppingBag, TicketPercent } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "@/components/customer/cart-context";
import { extractEdgeErrorMessage } from "@/lib/edge-function-error";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function CheckoutPage() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { items, totalCents, clear, promoCode, setPromoCode } = useCart();
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  /** idle = default (black), locating, success (green), error (red) */
  const [geoState, setGeoState] = useState<"idle" | "locating" | "success" | "error">("idle");
  const [saving, setSaving] = useState(false);
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const phoneDigits = phone.replace(/\D/g, "").slice(0, 9);

  const geoButtonLabel =
    geoState === "locating"
      ? "Joylashuv aniqlanmoqda…"
      : geoState === "success"
        ? "Joylashuv aniqlandi — buyurtma berishingiz mumkin"
        : geoState === "error"
          ? "Joylashuv aniqlanmadi — qayta urinib ko'ring"
          : "Joylashuvni aniqlash";

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoState("error");
      setLat(null);
      setLng(null);
      toast.error("Brauzer geolokatsiyani qo'llamaydi");
      return;
    }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState("success");
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => {
        setGeoState("error");
        setLat(null);
        setLng(null);
        toast.error("Geolokatsiya aniqlanmadi");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (items.length === 0) return;
    if (lat == null || lng == null) return toast.error("Avval geolokatsiyani aniqlang");
    const restaurantId = items[0].restaurantId;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    const isGuest = !user;
    const normalizedPhone = phoneDigits.length === 9 ? `+998${phoneDigits}` : "";
    if (phoneDigits.length !== 9) {
      setSaving(false);
      toast.error("Buyurtma uchun 9 xonali telefon kiriting");
      return;
    }
    if (!isGuest) {
      const { data: profile } = await supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle();
      const profilePhone = typeof profile?.phone === "string" ? profile.phone.trim() : "";
      if (!profilePhone && !normalizedPhone) {
        setSaving(false);
        toast.error("Buyurtma uchun telefon raqamingizni kiriting");
        return;
      }
      if (normalizedPhone && normalizedPhone !== profilePhone) {
        const { error: phoneUpdateError } = await supabase.from("profiles").update({ phone: normalizedPhone }).eq("id", user.id);
        if (phoneUpdateError) {
          setSaving(false);
          toast.error("Telefonni saqlab bo'lmadi, qayta urinib ko'ring");
          return;
        }
      }
    }

    let guestDeviceId: string | null = null;
    if (isGuest) {
      guestDeviceId = window.localStorage.getItem("guest_checkout_device_id");
      if (!guestDeviceId) {
        guestDeviceId = crypto.randomUUID();
        window.localStorage.setItem("guest_checkout_device_id", guestDeviceId);
      }
    }

    const payload: Record<string, unknown> = {
      restaurant_id: restaurantId,
      address_id: null,
      payment_method: "cash",
      guest_phone: normalizedPhone,
      guest_lat: lat,
      guest_lng: lng,
      guest_device_id: isGuest ? guestDeviceId : null,
      items: items.map((item) => ({
        menu_item_id: item.id.includes(":") ? item.id.split(":")[0] : item.id,
        quantity: item.quantity,
        selected_option_ids: item.id.includes(":") ? item.id.split(":")[1]?.split(",").filter(Boolean) ?? [] : [],
      })),
    };
    const activeRequestId = requestId ?? crypto.randomUUID();
    if (!requestId) {
      setRequestId(activeRequestId);
    }
    payload.request_id = activeRequestId;
    if (promoCode.trim()) {
      payload.promo_code = promoCode.trim();
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const reqHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      reqHeaders.Authorization = `Bearer ${session.access_token}`;
    }

    let res: Response;
    try {
      res = await fetch("/api/create-order", {
        method: "POST",
        headers: reqHeaders,
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
    } catch {
      setSaving(false);
      return toast.error("Tarmoq xatosi — qayta urinib ko'ring");
    }

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      setSaving(false);
      return toast.error(text.trim().slice(0, 220) || "Buyurtma yuborilmadi");
    }

    setSaving(false);

    const row = json as { order_id?: string; error?: string } | null;
    if (row?.order_id) {
      window.localStorage.setItem("customer_last_order_id", row.order_id);
      setRequestId(null);
      clear();
      toast.success("Buyurtma yuborildi");
      if (isGuest) return router.push("/home");
      router.push(`/orders/${row.order_id}`);
      return;
    }

    const raw =
      typeof row?.error === "string"
        ? row.error
        : extractEdgeErrorMessage(json, res.status, text);
    const mapped =
      raw === "Forbidden"
        ? "Bu akkaunt bilan buyurtma berib bo'lmaydi (faqat mijoz roli)."
        : raw === "Guest checkout requires phone and location"
          ? "Telefon va joylashuv majburiy."
          : raw === "Location is required"
            ? "Joylashuv majburiy."
            : raw === "Guest daily limit reached (2 orders)"
              ? "Ro'yxatdan o'tmasdan bir kunda faqat 2 ta buyurtma berish mumkin."
            : raw.includes("Requested function was not found") || raw.includes("not found")
              ? "Supabase-da create_order funksiyasi topilmadi yoki yangilanmagan. Supabase Dashboard → Edge Functions dan deploy qiling."
              : raw;
    if (raw === "Guest daily limit reached (2 orders)") {
      setShowGuestLimitModal(true);
      return;
    }
    toast.error(mapped);
  };

  return (
    <main className="min-h-screen bg-zinc-50 pb-28">
      <div className="mx-auto w-full max-w-md p-4">
        <header className="mb-4">
          <button type="button" onClick={() => router.back()} className="-ml-1 inline-flex items-center rounded-full p-1 text-zinc-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="mt-1 text-3xl font-bold text-zinc-900">Buyurtma berish</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
            <Shield className="h-3.5 w-3.5" /> Ma&apos;lumotlaringiz himoyalangan
          </p>
        </header>

        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="space-y-4">
              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                    <TicketPercent className="h-4 w-4 text-orange-500" /> Promokod (ixtiyoriy)
                  </span>
                  <button type="button" className="text-sm font-semibold text-orange-500">
                    Qo&apos;llash
                  </button>
                </div>
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Promokodni kiriting"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm uppercase outline-none focus:border-orange-400"
                  autoComplete="off"
                />
              </label>

              <label className="block">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <Phone className="h-4 w-4 text-orange-500" /> Telefon raqam
                </div>
                <div className="flex items-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 focus-within:border-orange-400">
                  <span className="border-r border-zinc-200 bg-white px-3 py-3 text-sm font-semibold text-zinc-700">+998</span>
                  <input
                    value={phoneDigits}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    placeholder="90 123 45 67"
                    className="w-full bg-transparent px-3 py-3 text-sm outline-none"
                    inputMode="numeric"
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">9 ta raqam kiriting</p>
              </label>

              <div className="block">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <MapPin className="h-4 w-4 text-orange-500" /> Yetkazib berish manzili
                </div>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={geoState === "locating"}
                  className={
                    "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 " +
                    (geoState === "success"
                      ? "border-green-300 bg-green-50 text-green-700"
                      : geoState === "error"
                        ? "border-red-300 bg-red-50 text-red-600"
                        : "border-orange-200 bg-orange-50 text-orange-600")
                  }
                >
                  <MapPin className="h-4 w-4" /> {geoButtonLabel}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">Buyurtma tafsilotlari</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-zinc-700">
                <span>Taomlar ({items.length} ta)</span>
                <span>{(totalCents / 100).toFixed(0)} so&apos;m</span>
              </div>
              <div className="flex items-center justify-between text-zinc-700">
                <span>Yetkazib berish</span>
                <span>0 so&apos;m</span>
              </div>
              {promoCode.trim() ? (
                <div className="flex items-center justify-between text-emerald-600">
                  <span>Promokod chegirmasi</span>
                  <span>- 0 so&apos;m</span>
                </div>
              ) : null}
            </div>
            <div className="my-3 h-px bg-zinc-100" />
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-zinc-900">Jami to&apos;lov</p>
              <p className="text-2xl font-extrabold text-orange-500">{(totalCents / 100).toFixed(0)} so&apos;m</p>
            </div>
          </section>
        </form>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={saving || items.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-base font-bold text-white shadow-sm disabled:opacity-50"
          >
            <ShoppingBag className="h-5 w-5" />
            {saving ? "Yuborilmoqda..." : "Buyurtma berish"}
          </button>
        </div>
      </div>

      {showGuestLimitModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Buyurtma limiti</h2>
            <p className="mt-2 text-sm text-zinc-600">
              {
                "Bir kunda ro'yxatdan o'tmasdan faqat 2 ta buyurtma berish mumkin. Yana buyurtma berish uchun, iltimos ro'yxatdan o'ting."
              }
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGuestLimitModal(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
              >
                Yopish
              </button>
              <button
                type="button"
                onClick={() => router.push("/register?next=/checkout")}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
              >
                {"Ro'yxatdan o'tish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
