"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type RestaurantRow = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  image_url: string | null;
  is_open: boolean;
  open_time_from: string | null;
  open_time_to: string | null;
  delivery_fee_cents: number;
  min_order_cents: number;
  owner_id: string | null;
  category_id: string | null;
};

type Category = {
  id: string;
  name: string;
};

const supabase = createSupabaseBrowserClient();

export default function AdminRestaurantsPage() {
  const [rows, setRows] = useState<RestaurantRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [openTimeFrom, setOpenTimeFrom] = useState("09:00");
  const [openTimeTo, setOpenTimeTo] = useState("23:00");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [minOrder, setMinOrder] = useState("0");
  const [ownerId, setOwnerId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const loadData = async () => {
    const [{ data: restaurants, error: restaurantsError }, { data: categoryRows, error: categoriesError }] =
      await Promise.all([
        supabase
          .from("restaurants")
          .select("id,name,description,slug,image_url,is_open,open_time_from,open_time_to,delivery_fee_cents,min_order_cents,owner_id,category_id")
          .order("name"),
        supabase.from("categories").select("id,name").order("sort_order", { ascending: true }),
      ]);

    if (restaurantsError) {
      toast.error(restaurantsError.message);
      return;
    }
    if (categoriesError) {
      toast.error(categoriesError.message);
      return;
    }

    setRows((restaurants ?? []) as RestaurantRow[]);
    setCategories((categoryRows ?? []) as Category[]);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setName("");
    setDescription("");
    setSlug("");
    setImageUrl("");
    setIsOpen(false);
    setOpenTimeFrom("09:00");
    setOpenTimeTo("23:00");
    setDeliveryFee("0");
    setMinOrder("0");
    setOwnerId("");
    setCategoryId("");
  };

  const startEdit = (row: RestaurantRow) => {
    setEditingId(row.id);
    setShowForm(true);
    setName(row.name);
    setDescription(row.description ?? "");
    setSlug(row.slug ?? "");
    setImageUrl(row.image_url ?? "");
    setIsOpen(row.is_open);
    setOpenTimeFrom((row.open_time_from ?? "09:00").slice(0, 5));
    setOpenTimeTo((row.open_time_to ?? "23:00").slice(0, 5));
    setDeliveryFee((row.delivery_fee_cents / 100).toFixed(2));
    setMinOrder((row.min_order_cents / 100).toFixed(2));
    setOwnerId(row.owner_id ?? "");
    setCategoryId(row.category_id ?? "");
  };

  const startCreate = () => {
    setEditingId(null);
    setShowForm(true);
    setName("");
    setDescription("");
    setSlug("");
    setImageUrl("");
    setIsOpen(false);
    setOpenTimeFrom("09:00");
    setOpenTimeTo("23:00");
    setDeliveryFee("0");
    setMinOrder("0");
    setOwnerId("");
    setCategoryId("");
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    final payload = {
      "name": name.trim(),
      "description": description.trim().isEmpty ? null : description.trim(),
      "slug": slug.trim().isEmpty ? null : slug.trim(),
      "image_url": imageUrl.trim().isEmpty ? null : imageUrl.trim(),
      "is_open": isOpen,
      "open_time_from": openTimeFrom.isEmpty ? null : openTimeFrom,
      "open_time_to": openTimeTo.isEmpty ? null : openTimeTo,
      "delivery_fee_cents": Math.max(0, Math.round(Number(deliveryFee || "0") * 100)),
      "min_order_cents": Math.max(0, Math.round(Number(minOrder || "0") * 100)),
      "owner_id": ownerId.trim().isEmpty ? null : ownerId.trim(),
      "category_id": categoryId.isEmpty ? null : categoryId,
    };

    final response = editingId != null
        ? await supabase.from("restaurants").update(payload).eq("id", editingId)
        : await supabase.from("restaurants").insert(payload);
    setSaving(false);

    if (response.error != null) return toast.error(response.error.message);
    toast.success(editingId != null ? "Restaurant updated" : "Restaurant created");
    resetForm();
    await loadData();
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Restaurants</h1>
      <p className="text-sm text-zinc-500">
        Admin can edit restaurant data: open/closed status, name, description, image, slug, fees and category.
      </p>
      <div>
        <button onClick={startCreate} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
          Create restaurant
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Owner ID</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((restaurant) => (
              <tr key={restaurant.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{restaurant.name}</td>
                <td className="px-4 py-3">{restaurant.is_open ? "Open" : "Closed"}</td>
                <td className="px-4 py-3 text-xs">{restaurant.owner_id ?? "-"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => startEdit(restaurant)}
                    className="rounded border border-zinc-300 px-3 py-1 text-xs"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Name"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Slug"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL"
            className="rounded-lg border border-zinc-300 px-3 py-2 md:col-span-2"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className="rounded-lg border border-zinc-300 px-3 py-2 md:col-span-2"
          />
          <input
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            placeholder="Owner user ID"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            placeholder="Delivery fee"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            placeholder="Min order"
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <input
            type="time"
            value={openTimeFrom}
            onChange={(e) => setOpenTimeFrom(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <input
            type="time"
            value={openTimeTo}
            onChange={(e) => setOpenTimeTo(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2">
            <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
            Open now
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
            >
              {editingId != null ? "Save changes" : "Create"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-300 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
