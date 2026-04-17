"use client";

import { FormEvent, useState } from "react";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "@/components/customer/cart-context";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function CheckoutPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { items, totalCents, clear } = useCart();
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  /** idle = default (black), locating, success (green), error (red) */
  const [geoState, setGeoState] = useState<"idle" | "locating" | "success" | "error">("idle");
  const [saving, setSaving] = useState(false);
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
    if (isGuest && phoneDigits.length !== 9) {
      setSaving(false);
      toast.error("Mehmon buyurtma uchun 9 xonali telefon kiriting");
      return;
    }

    let guestDeviceId: string | null = null;
    if (isGuest) {
      guestDeviceId = window.localStorage.getItem("guest_checkout_device_id");
      if (!guestDeviceId) {
        guestDeviceId = crypto.randomUUID();
        window.localStorage.setItem("guest_checkout_device_id", guestDeviceId);
      }
    }

    const { data, error } = await supabase.functions.invoke("create_order", {
      body: {
        restaurant_id: restaurantId,
        address_id: null,
        payment_method: "cash",
        guest_phone: isGuest ? `+998${phoneDigits}` : null,
        guest_lat: lat,
        guest_lng: lng,
        guest_device_id: isGuest ? guestDeviceId : null,
        items: items.map((item) => ({
          menu_item_id: item.id.includes(":") ? item.id.split(":")[0] : item.id,
          quantity: item.quantity,
          selected_option_ids: item.id.includes(":") ? item.id.split(":")[1]?.split(",").filter(Boolean) ?? [] : [],
        })),
      },
    });
    setSaving(false);
    if (error) return toast.error(error.message ?? "Buyurtma yuborilmadi");
    clear();
    toast.success("Buyurtma yuborildi");
    if (isGuest) return router.push("/home");
    router.push(`/orders/${data?.order_id ?? ""}`);
  };

  return (
    <main className="space-y-4 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-600">Telefon</span>
          <div className="flex items-center overflow-hidden rounded-lg border border-zinc-300 bg-white focus-within:border-zinc-900">
            <span className="border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">+998</span>
            <input
              value={phoneDigits}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="901234567"
              className="w-full px-3 py-2 outline-none"
              inputMode="numeric"
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">9 ta raqam kiriting</p>
        </label>
        <button
          type="button"
          onClick={detectLocation}
          disabled={geoState === "locating"}
          className={
            "mx-auto flex w-fit max-w-full items-center justify-center gap-1.5 whitespace-normal rounded-lg px-4 py-2 text-center text-sm font-medium leading-snug text-white transition disabled:cursor-not-allowed disabled:opacity-70 " +
            (geoState === "success"
              ? "bg-green-600 hover:bg-green-700"
              : geoState === "error"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-zinc-900 hover:bg-zinc-800")
          }
        >
          <MapPin className="h-4 w-4 shrink-0 self-center" aria-hidden />
          {geoButtonLabel}
        </button>
        {geoState === "success" && lat != null && lng != null ? (
          <p className="text-center text-sm text-zinc-500">Pastdagi tugma orqali buyurtma bering</p>
        ) : geoState === "error" ? null : (
          <p className="text-center text-sm text-zinc-500">Buyurtma uchun avval joylashuvni aniqlang</p>
        )}
        <p className="text-sm text-zinc-500">Jami: {(totalCents / 100).toFixed(0)} so&apos;m</p>
        <button disabled={saving || items.length === 0} className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50">
          {saving ? "Yuborilmoqda..." : "Buyurtma berish"}
        </button>
      </form>
    </main>
  );
}
