"use client";

import Link from "next/link";
import Image from "next/image";

const ETA_LABELS = ["20 – 30 daqiqa", "15 – 45 daqiqa", "25 – 30 daqiqa", "40 – 45 daqiqa"];

export type RestaurantHeroCardProps = {
  id: string;
  name: string;
  imageUrl: string | null;
  categoryLabel?: string | null;
  deliveryFeeCents?: number | null;
  isOpen?: boolean;
  /** For rotating delivery time labels like the mobile app */
  listIndex?: number;
  /** Slightly smaller card variant for dense lists */
  compact?: boolean;
  /** First visible card on home: faster LCP */
  priority?: boolean;
};

export function RestaurantHeroCard({
  id,
  name,
  imageUrl,
  categoryLabel,
  deliveryFeeCents,
  isOpen = true,
  listIndex = 0,
  compact = false,
  priority = false,
}: RestaurantHeroCardProps) {
  const eta = ETA_LABELS[listIndex % ETA_LABELS.length];
  const category = categoryLabel?.trim() || "Restoran";
  const deliveryStatus = (deliveryFeeCents ?? 0) <= 0 ? "Yetkazib berish: bepul" : "Yetkazib berish: pullik";

  return (
    <Link
      href={`/home/restaurant/${id}`}
      className={`group relative block w-full overflow-hidden rounded-[18px] shadow-[0_3px_14px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition active:scale-[0.99] ${compact ? "h-[142px] sm:h-[156px] lg:h-[168px]" : "h-[166px] sm:h-[182px] lg:h-[196px]"}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          priority={priority}
          fetchPriority={priority ? "high" : "low"}
          decoding={priority ? "sync" : "async"}
          sizes={compact ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 60vw"}
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-400 to-zinc-600" aria-hidden />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/35 to-black/10" />
      {!isOpen ? (
        <span className={`absolute right-3 top-3 rounded-full bg-black/55 text-xs font-medium text-white backdrop-blur-sm ${compact ? "px-2 py-0.5" : "px-2.5 py-1"}`}>Yopiq</span>
      ) : null}
      <div className={`absolute inset-x-0 top-0 ${compact ? "p-2.5 sm:p-3" : "p-3 sm:p-4"}`}>
        <h3 className={`font-extrabold leading-snug text-white drop-shadow-sm md:leading-tight ${compact ? "text-[18px] sm:text-lg" : "text-xl sm:text-xl"}`}>{name}</h3>
        <p className={`mt-0.5 font-semibold leading-normal text-white/90 md:leading-snug ${compact ? "text-[14px] sm:text-sm" : "text-base sm:text-base"}`}>{category}</p>
        <div className={`mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 leading-normal text-white md:leading-snug ${compact ? "text-[14px] sm:text-sm" : "text-base sm:text-base"}`}>
          <span className="font-semibold text-white/90">{deliveryStatus}</span>
        </div>
        <div className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 leading-normal text-white md:leading-snug ${compact ? "text-[14px] sm:text-sm" : "text-base sm:text-base"}`}>
          <span className="font-medium text-white/90">{eta}</span>
        </div>
      </div>
    </Link>
  );
}

