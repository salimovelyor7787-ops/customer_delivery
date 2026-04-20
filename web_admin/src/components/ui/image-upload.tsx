"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export type ImageUploadFolder =
  | "products"
  | "restaurants"
  | "banners"
  | "home-service-cards"
  | "home-nearby-cards";

type ImageUploadProps = {
  onUploaded: (url: string) => void;
  /** Supabase `product-images` bucket ichidagi papka */
  folder?: ImageUploadFolder;
  className?: string;
};

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "image";
}

export function ImageUpload({ onUploaded, folder = "products", className }: ImageUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const filePath = `${folder}/${Date.now()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from("product-images").upload(filePath, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
      if (error) throw error;

      const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
      onUploaded(data.publicUrl);
      toast.success("Rasm yuklandi");
    } catch {
      toast.error("Rasm yuklanmadi");
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const baseClass =
    "inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50";

  return (
    <label className={className ? `${baseClass} ${className}` : baseClass}>
      {isLoading ? "Yuklanmoqda…" : "Fayldan yuklash"}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onSelectFile} />
    </label>
  );
}
