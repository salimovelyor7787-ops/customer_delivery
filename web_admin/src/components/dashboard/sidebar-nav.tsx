"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, LogOut, Package, Percent, ShoppingBag, Tag, Truck, Users } from "lucide-react";
import { createSupabaseBrowserClient, type UserRole } from "@/lib/supabase";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const navByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Boshqaruv", icon: LayoutDashboard },
    { href: "/admin/users", label: "Foydalanuvchilar", icon: Users },
    { href: "/admin/restaurants", label: "Restoranlar", icon: ShoppingBag },
    { href: "/admin/menu-items", label: "Menu kartochkalari", icon: Package },
    { href: "/admin/categories", label: "Kategoriyalar", icon: Tag },
    { href: "/admin/service-cards", label: "Xizmat kartochkalari", icon: Package },
    { href: "/admin/nearby-cards", label: "Yaqin kartochkalar", icon: Package },
    { href: "/admin/deals", label: "Aksiyalar", icon: Percent },
    { href: "/admin/banners", label: "Bannerlar", icon: Package },
    { href: "/admin/promocodes", label: "Promokodlar", icon: Percent },
    { href: "/admin/push-notifications", label: "Push bildirishnomalar", icon: Bell },
    { href: "/admin/orders", label: "Buyurtmalar", icon: Truck },
  ],
  restaurant: [
    { href: "/restaurant", label: "Umumiy", icon: LayoutDashboard },
    { href: "/restaurant/products", label: "Mahsulotlar", icon: Package },
    { href: "/restaurant/couriers", label: "Kuryerlar", icon: Truck },
    { href: "/restaurant/promocodes", label: "Promokodlar", icon: Percent },
    { href: "/restaurant/couriers", label: "Kuryerlar", icon: Users },
    { href: "/restaurant/orders", label: "Buyurtmalar", icon: Truck },
  ],
  courier: [
    { href: "/courier", label: "Umumiy", icon: LayoutDashboard },
    { href: "/courier/orders", label: "Mening buyurtmalarim", icon: Truck },
  ],
};

type Props = {
  role: UserRole;
  /** Chaqiriladi: mobil drawer yopish */
  onNavigate?: () => void;
};

export function SidebarNav({ role, onNavigate }: Props) {
  const pathname = usePathname();

  const onLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <>
      <div className="mb-8 px-2">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Ovqat yetkazish</p>
        <h2 className="text-lg font-semibold text-zinc-900">Boshqaruv paneli</h2>
      </div>

      <nav className="space-y-1">
        {navByRole[role].map((item) => {
          const isRootDashboardItem = item.href === `/${role}`;
          const active = isRootDashboardItem ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mt-8 flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Chiqish
      </button>
    </>
  );
}
