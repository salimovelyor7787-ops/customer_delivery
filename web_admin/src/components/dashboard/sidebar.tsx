"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Package, Percent, ShoppingBag, Truck, Users } from "lucide-react";
import { createSupabaseBrowserClient, type UserRole } from "@/lib/supabase";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const navByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/restaurants", label: "Restaurants", icon: ShoppingBag },
    { href: "/admin/service-cards", label: "Service Cards", icon: Package },
    { href: "/admin/nearby-cards", label: "Nearby Cards", icon: Package },
    { href: "/admin/deals", label: "Deals", icon: Percent },
    { href: "/admin/banners", label: "Banners", icon: Package },
    { href: "/admin/promocodes", label: "Promocodes", icon: Percent },
    { href: "/admin/orders", label: "Orders", icon: Truck },
  ],
  restaurant: [
    { href: "/restaurant", label: "Overview", icon: LayoutDashboard },
    { href: "/restaurant/products", label: "Products", icon: Package },
    { href: "/restaurant/orders", label: "Orders", icon: Truck },
  ],
  courier: [
    { href: "/courier", label: "Overview", icon: LayoutDashboard },
    { href: "/courier/orders", label: "Assigned Orders", icon: Truck },
  ],
};

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  const onLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white p-4">
      <div className="mb-8 px-2">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Food Delivery</p>
        <h2 className="text-lg font-semibold text-zinc-900">Control Panel</h2>
      </div>

      <nav className="space-y-1">
        {navByRole[role].map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mt-8 flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </aside>
  );
}
