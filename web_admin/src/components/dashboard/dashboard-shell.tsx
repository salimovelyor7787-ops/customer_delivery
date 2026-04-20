"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import type { UserRole } from "@/lib/supabase";
import { usePathname } from "next/navigation";

type Props = {
  role: UserRole;
  children: React.ReactNode;
};

export function DashboardShell({ role, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4 shadow-sm lg:hidden">
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="dashboard-mobile-nav"
          aria-label="Menyuni ochish"
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2 text-zinc-800 hover:bg-zinc-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="truncate font-semibold text-zinc-900">Boshqaruv paneli</span>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-4 lg:block">
          <SidebarNav role={role} />
        </aside>

        {menuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden" id="dashboard-mobile-nav">
            <button
              type="button"
              aria-label="Menyuni yopish"
              className="absolute inset-0 bg-black/50"
              onClick={() => setMenuOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] max-w-sm flex-col border-r border-zinc-200 bg-white shadow-xl">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-100 px-3">
                <span className="font-semibold text-zinc-900">Menyu</span>
                <button
                  type="button"
                  aria-label="Yopish"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <SidebarNav role={role} onNavigate={() => setMenuOpen(false)} />
              </div>
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
