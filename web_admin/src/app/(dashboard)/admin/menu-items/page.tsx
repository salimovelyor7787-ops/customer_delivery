"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Restaurant = {
  id: string;
  name: string;
};

type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string | null;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
};

type MenuOption = {
  id: string;
  menu_item_id: string;
  name: string;
  price_delta_cents: number;
  sort_order: number;
};
type MenuCategory = {
  id: string;
  name: string;
  sort_order: number;
};

const supabase = createSupabaseBrowserClient();

export default function AdminMenuItemsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedOptionItemId, setSelectedOptionItemId] = useState("");
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("0");
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Boshqa");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  const selectedRestaurantName = useMemo(
    () => restaurants.find((item) => item.id === selectedRestaurantId)?.name ?? "",
    [restaurants, selectedRestaurantId],
  );

  const getDefaultCategory = () =>
    categories.find((item) => item.name === "Boshqa")?.name ?? categories[0]?.name ?? "Boshqa";

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCategory(getDefaultCategory());
    setDescription("");
    setPrice("0");
    setImageUrl("");
    setIsAvailable(true);
  };

  const loadRestaurants = async () => {
    const { data, error } = await supabase.from("restaurants").select("id,name").order("name", { ascending: true });
    if (error) return toast.error(error.message);
    const list = (data ?? []) as Restaurant[];
    setRestaurants(list);
    if (!selectedRestaurantId && list.length > 0) {
      setSelectedRestaurantId(list[0].id);
    }
  };

  const loadMenuItems = async (restaurantId: string) => {
    if (!restaurantId) {
      setMenuItems([]);
      return;
    }
    const { data, error } = await supabase
      .from("menu_items")
      .select("id,restaurant_id,name,category,description,price_cents,image_url,is_available,sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) return toast.error(error.message);
    setMenuItems((data ?? []) as MenuItem[]);
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) return toast.error(error.message);
    const list = (data ?? []) as MenuCategory[];
    setCategories(list);
    setCategory((prev) =>
      list.some((item) => item.name === prev) ? prev : list.find((item) => item.name === "Boshqa")?.name ?? list[0]?.name ?? "Boshqa",
    );
  };

  const loadOptions = async (menuItemId: string) => {
    if (!menuItemId) {
      setOptions([]);
      return;
    }
    const { data, error } = await supabase
      .from("menu_item_options")
      .select("id,menu_item_id,name,price_delta_cents,sort_order")
      .eq("menu_item_id", menuItemId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) return toast.error(error.message);
    setOptions((data ?? []) as MenuOption[]);
  };

  useEffect(() => {
    void loadRestaurants();
    void loadCategories();
  }, []);

  useEffect(() => {
    void loadMenuItems(selectedRestaurantId);
    resetForm();
    setSelectedOptionItemId("");
    setOptions([]);
    setEditingOptionId(null);
    setOptionName("");
    setOptionPrice("0");
  }, [selectedRestaurantId]);

  useEffect(() => {
    setCategory((prev) => (categories.some((item) => item.name === prev) ? prev : getDefaultCategory()));
  }, [categories]);

  useEffect(() => {
    void loadOptions(selectedOptionItemId);
    setEditingOptionId(null);
    setOptionName("");
    setOptionPrice("0");
  }, [selectedOptionItemId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedRestaurantId) return toast.error("Avval restoran tanlang");

    setSaving(true);
    const payload = {
      restaurant_id: selectedRestaurantId,
      name: name.trim(),
      category: category.trim() || "Boshqa",
      description: description.trim() === "" ? null : description.trim(),
      price_cents: Math.max(0, Math.round(Number(price || "0") * 100)),
      image_url: imageUrl.trim() === "" ? null : imageUrl.trim(),
      is_available: isAvailable,
      sort_order: editingId ? undefined : menuItems.length,
    };

    const response =
      editingId == null
        ? await supabase.from("menu_items").insert(payload)
        : await supabase
            .from("menu_items")
            .update({
              name: payload.name,
              category: payload.category,
              description: payload.description,
              price_cents: payload.price_cents,
              image_url: payload.image_url,
              is_available: payload.is_available,
            })
            .eq("id", editingId)
            .eq("restaurant_id", selectedRestaurantId);
    setSaving(false);

    if (response.error) return toast.error(response.error.message);
    toast.success(editingId == null ? "Menu kartochkasi yaratildi" : "Menu kartochkasi yangilandi");
    resetForm();
    await loadMenuItems(selectedRestaurantId);
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category ?? "Boshqa");
    setDescription(item.description ?? "");
    setPrice((item.price_cents / 100).toFixed(2));
    setImageUrl(item.image_url ?? "");
    setIsAvailable(item.is_available);
  };

  const onDelete = async (id: string) => {
    if (!selectedRestaurantId) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id).eq("restaurant_id", selectedRestaurantId);
    if (error) return toast.error(error.message);
    toast.success("Kartochka o'chirildi");
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  };

  const onCreateOption = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedOptionItemId) return toast.error("Avval menu kartochkasini tanlang");
    const cleanName = optionName.trim();
    if (!cleanName) return;

    const { error } = await supabase.from("menu_item_options").insert({
      menu_item_id: selectedOptionItemId,
      name: cleanName,
      price_delta_cents: Math.round(Number(optionPrice || "0") * 100),
      sort_order: options.length,
    });
    if (error) return toast.error(error.message);
    toast.success("Qo'shimcha qo'shildi");
    setOptionName("");
    setOptionPrice("0");
    await loadOptions(selectedOptionItemId);
  };

  const onEditOption = (option: MenuOption) => {
    setEditingOptionId(option.id);
    setOptionName(option.name);
    setOptionPrice((option.price_delta_cents / 100).toFixed(2));
  };

  const onSaveOption = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingOptionId) return;
    const cleanName = optionName.trim();
    if (!cleanName) return;

    const { error } = await supabase
      .from("menu_item_options")
      .update({
        name: cleanName,
        price_delta_cents: Math.round(Number(optionPrice || "0") * 100),
      })
      .eq("id", editingOptionId);
    if (error) return toast.error(error.message);
    toast.success("Qo'shimcha yangilandi");
    setEditingOptionId(null);
    setOptionName("");
    setOptionPrice("0");
    await loadOptions(selectedOptionItemId);
  };

  const onCancelOptionEdit = () => {
    setEditingOptionId(null);
    setOptionName("");
    setOptionPrice("0");
  };

  const onDeleteOption = async (id: string) => {
    const { error } = await supabase.from("menu_item_options").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Qo'shimcha o'chirildi");
    setOptions((prev) => prev.filter((item) => item.id !== id));
  };

  const onMoveOption = async (id: string, direction: "up" | "down") => {
    const index = options.findIndex((item) => item.id === id);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;

    const next = [...options];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    const normalized = next.map((item, idx) => ({ ...item, sort_order: idx }));
    setOptions(normalized);

    const updates = normalized.map((item) =>
      supabase.from("menu_item_options").update({ sort_order: item.sort_order }).eq("id", item.id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      toast.error(failed.error.message);
      await loadOptions(selectedOptionItemId);
    }
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Menu kartochkalari</h1>
      <p className="text-sm text-zinc-500">
        Admin restoranni tanlab, uning menu kartochkalarini yaratishi va boshqarishi mumkin.
      </p>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-zinc-700">Restoran</label>
        <select
          value={selectedRestaurantId}
          onChange={(e) => setSelectedRestaurantId(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 md:max-w-md"
        >
          {restaurants.length === 0 ? <option value="">Restoranlar topilmadi</option> : null}
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Kategoriyalar</h2>
        <div className="flex flex-wrap items-center gap-2">
          {categories.length === 0 ? <p className="text-sm text-zinc-500">Kategoriya hali yo&apos;q. Avval Kategoriyalar bo&apos;limida qo&apos;shing.</p> : null}
          {categories.map((cat) => (
            <span key={cat.id} className="inline-flex items-center rounded-full border border-zinc-300 px-3 py-1.5 text-xs">
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Nomi"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2">
          {categories.length === 0 ? <option value="Boshqa">Boshqa</option> : null}
          {categories.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tavsif"
          rows={3}
          className="rounded-lg border border-zinc-300 px-3 py-2 md:col-span-2"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          placeholder="Narx"
          className="rounded-lg border border-zinc-300 px-3 py-2"
        />
        <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          Mavjud (sotuvda)
        </label>
        <div className="flex flex-col gap-2 md:col-span-2">
          <div className="flex flex-wrap items-stretch gap-2">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Rasm URL (ixtiyoriy)"
              className="min-w-[220px] flex-1 rounded-lg border border-zinc-300 px-3 py-2"
            />
            <ImageUpload folder="products" onUploaded={setImageUrl} />
          </div>
        </div>

        <div className="flex gap-2 md:col-span-2">
          <button
            type="submit"
            disabled={saving || !selectedRestaurantId}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {editingId == null ? "Kartochka qo'shish" : "Saqlash"}
          </button>
          {editingId != null ? (
            <button type="button" onClick={resetForm} className="rounded-lg border border-zinc-300 px-4 py-2">
              Bekor qilish
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-[760px] text-sm md:min-w-full">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nomi</th>
              <th className="px-4 py-3">Kategoriya</th>
              <th className="px-4 py-3">Narx</th>
              <th className="px-4 py-3">Holat</th>
              <th className="px-4 py-3">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {menuItems.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                  {selectedRestaurantId
                    ? `${selectedRestaurantName || "Restoran"} uchun menu kartochkalari hozircha yo'q.`
                    : "Restoran tanlang."}
                </td>
              </tr>
            ) : (
              menuItems.map((item) => (
                <tr key={item.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.name}</p>
                    {item.description ? <p className="max-w-[380px] truncate text-xs text-zinc-500">{item.description}</p> : null}
                  </td>
                  <td className="px-4 py-3">{item.category ?? "Boshqa"}</td>
                  <td className="px-4 py-3">so&apos;m {(item.price_cents / 100).toFixed(0)}</td>
                  <td className="px-4 py-3">{item.is_available ? "Mavjud" : "Yashirin"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(item)} className="rounded border border-zinc-300 px-3 py-1 text-xs">
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(item.id)}
                        className="rounded border border-red-300 px-3 py-1 text-xs text-red-600"
                      >
                        O&apos;chirish
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Qo&apos;shimchalar (соус, сыр, ...)</h2>
        <div className="grid gap-3 md:grid-cols-[minmax(240px,360px)_1fr]">
          <select
            value={selectedOptionItemId}
            onChange={(e) => setSelectedOptionItemId(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="">Menu kartochkasini tanlang</option>
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <form onSubmit={editingOptionId ? onSaveOption : onCreateOption} className="grid gap-2 sm:grid-cols-[1fr_120px_auto_auto]">
            <input
              value={optionName}
              onChange={(e) => setOptionName(e.target.value)}
              placeholder="Masalan: Qo'shimcha pishloq"
              className="rounded-lg border border-zinc-300 px-3 py-2"
              required
            />
            <input
              value={optionPrice}
              onChange={(e) => setOptionPrice(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="Narx"
              className="rounded-lg border border-zinc-300 px-3 py-2"
              required
            />
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-white" disabled={!selectedOptionItemId}>
              {editingOptionId ? "Saqlash" : "Qo&apos;shish"}
            </button>
            {editingOptionId ? (
              <button type="button" onClick={onCancelOptionEdit} className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-700">
                Bekor qilish
              </button>
            ) : null}
          </form>
        </div>

        {selectedOptionItemId ? (
          options.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="min-w-[680px] text-sm md:min-w-full">
                <thead className="bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Nomi</th>
                    <th className="px-3 py-2">Narx</th>
                    <th className="px-3 py-2">Tartib</th>
                    <th className="px-3 py-2">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((option, idx) => (
                    <tr key={option.id} className="border-t border-zinc-100">
                      <td className="px-3 py-2">{option.name}</td>
                      <td className="px-3 py-2">so&apos;m {(option.price_delta_cents / 100).toFixed(0)}</td>
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded border border-zinc-300 px-2 py-1 text-xs"
                            onClick={() => void onMoveOption(option.id, "up")}
                            disabled={idx === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="rounded border border-zinc-300 px-2 py-1 text-xs"
                            onClick={() => void onMoveOption(option.id, "down")}
                            disabled={idx === options.length - 1}
                          >
                            ↓
                          </button>
                          <button type="button" className="rounded border border-zinc-300 px-2 py-1 text-xs" onClick={() => onEditOption(option)}>
                            Tahrirlash
                          </button>
                          <button
                            type="button"
                            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                            onClick={() => void onDeleteOption(option.id)}
                          >
                            O&apos;chirish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Bu kartochka uchun qo&apos;shimcha hali qo&apos;shilmagan.</p>
          )
        ) : (
          <p className="text-sm text-zinc-500">Qo&apos;shimchalarni boshqarish uchun avval menu kartochkasini tanlang.</p>
        )}
      </div>
    </section>
  );
}
