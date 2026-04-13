"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function ImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const onSelectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const filePath = `products/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("product-images").upload(filePath, file, { upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
      onUploaded(data.publicUrl);
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
      {isLoading ? "Uploading..." : "Upload image"}
      <input type="file" accept="image/*" className="hidden" onChange={onSelectFile} />
    </label>
  );
}
