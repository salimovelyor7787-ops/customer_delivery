"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, User } from "lucide-react";
import { useCart } from "./cart-context";

const items = [
  { href: "/home", label: "Asosiy", icon: Home },
  { href: "/search", label: "Qidiruv", icon: Search },
  { href: "/cart", label: "Savat", icon: ShoppingCart },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { totalCount } = useCart();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={`relative flex flex-col items-center gap-1 p-2 text-xs ${active ? "text-orange-600" : "text-zinc-500"}`}>
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.href === "/cart" && totalCount > 0 ? <span className="absolute right-0 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{totalCount}</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
