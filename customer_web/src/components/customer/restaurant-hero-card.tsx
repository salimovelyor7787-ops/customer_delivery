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
  const deliveryStatus = (deliveryFeeCents ?? 0) <= 0 ? "Yetkazib berish: bepul" : "Yetkazib berish: pullik";
  const deliveryBadgeClass = (deliveryFeeCents ?? 0) <= 0 ? "bg-emerald-600/95 text-white" : "bg-amber-500/95 text-zinc-950";

  return (
    <Link
      href={`/home/restaurant/${id}`}
      className="group block w-full overflow-hidden rounded-[18px] bg-white ring-1 ring-black/5 transition active:scale-[0.99]"
    >
      <div className={`relative overflow-hidden ${compact ? "h-[124px] sm:h-[136px] lg:h-[144px]" : "h-[156px] sm:h-[172px] lg:h-[186px]"}`}>
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
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-300" aria-hidden />
        )}
        <span className={`absolute left-3 top-3 rounded-full text-xs font-semibold ${compact ? "px-2 py-0.5" : "px-2.5 py-1"} ${deliveryBadgeClass}`}>
          {deliveryStatus}
        </span>
        {!isOpen ? (
          <span className={`absolute right-3 top-3 rounded-full bg-black/60 text-xs font-medium text-white ${compact ? "px-2 py-0.5" : "px-2.5 py-1"}`}>Yopiq</span>
        ) : null}
      </div>
      <div className={compact ? "space-y-0.5 p-2 sm:p-2.5" : "space-y-1 p-2.5 sm:p-3"}>
        <h3 className={`font-extrabold leading-snug text-zinc-900 md:leading-tight ${compact ? "text-[17px] sm:text-lg" : "text-xl sm:text-xl"}`}>{name}</h3>
        <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 leading-normal text-zinc-700 md:leading-snug ${compact ? "text-[14px] sm:text-sm" : "text-base sm:text-base"}`}>
          <span className="font-medium">{eta}</span>
        </div>
      </div>
    </Link>
  );
}

