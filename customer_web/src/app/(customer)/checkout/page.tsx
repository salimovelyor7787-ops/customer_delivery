"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "@/components/customer/cart-context";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function CheckoutPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { items, totalCents, clear } = useCart();
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error("Brauzer geolokatsiyani qo'llamaydi");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => {
        setLocating(false);
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
    if (isGuest && phone.trim().length !== 9) {
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
        guest_phone: isGuest ? `+998${phone.trim()}` : null,
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
    <main className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="Telefon (901234567)" className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Yetkazish manzili" rows={3} className="w-full rounded-lg border border-zinc-300 px-3 py-2" required />
        <button type="button" onClick={detectLocation} disabled={locating} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">
          {locating ? "Aniqlanmoqda..." : lat && lng ? "Joylashuv aniqlandi" : "Joylashuvni aniqlash"}
        </button>
        <p className="text-sm text-zinc-500">Jami: so&apos;m {(totalCents / 100).toFixed(0)}</p>
        <button disabled={saving || items.length === 0} className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50">
          {saving ? "Yuborilmoqda..." : "Buyurtma berish"}
        </button>
      </form>
    </main>
  );
}
