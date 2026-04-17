"use client";

import Link from "next/link";
import { Star } from "lucide-react";

const ETA_LABELS = ["20 – 30 daqiqa", "15 – 45 daqiqa", "25 – 30 daqiqa", "40 – 45 daqiqa"];

function ratingFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (4.5 + (Math.abs(h) % 6) * 0.1).toFixed(1);
}

export type RestaurantHeroCardProps = {
  id: string;
  name: string;
  imageUrl: string | null;
  categoryLabel?: string | null;
  isOpen?: boolean;
  /** For rotating delivery time labels like the mobile app */
  listIndex?: number;
  /** Slightly smaller card variant for dense lists */
  compact?: boolean;
};

export function RestaurantHeroCard({ id, name, imageUrl, categoryLabel, isOpen = true, listIndex = 0, compact = false }: RestaurantHeroCardProps) {
  const eta = ETA_LABELS[listIndex % ETA_LABELS.length];
  const rating = ratingFromId(id);
  const category = categoryLabel?.trim() || "Restoran";

  return (
    <Link
      href={`/home/restaurant/${id}`}
      className={`group relative block w-full overflow-hidden rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition active:scale-[0.99] ${compact ? "h-[168px] sm:h-[184px] lg:h-[198px]" : "h-[188px] sm:h-[208px] lg:h-[228px]"}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-400 to-zinc-600" aria-hidden />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
      {!isOpen ? (
        <span className={`absolute right-3 top-3 rounded-full bg-black/55 text-xs font-medium text-white backdrop-blur-sm ${compact ? "px-2 py-0.5" : "px-2.5 py-1"}`}>Yopiq</span>
      ) : null}
      <div className={`absolute inset-x-0 bottom-0 ${compact ? "p-3.5 pb-3.5 sm:p-4 sm:pb-4" : "p-4 pb-4 sm:p-5 sm:pb-5"}`}>
        <h3 className={`font-bold leading-tight text-white drop-shadow-sm ${compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"}`}>{name}</h3>
        <p className={`mt-1 font-normal text-white/90 ${compact ? "text-xs sm:text-sm" : "text-sm"}`}>{category}</p>
        <div className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-white ${compact ? "text-xs sm:text-sm" : "text-sm"}`}>
          <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
            <Star className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} shrink-0 fill-amber-400 text-amber-400`} aria-hidden />
            {rating}
          </span>
          <span className="text-white/70">—</span>
          <span className="font-normal text-white/90">{eta}</span>
        </div>
      </div>
    </Link>
  );
}

