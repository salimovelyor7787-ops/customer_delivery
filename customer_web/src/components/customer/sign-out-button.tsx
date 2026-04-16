"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase";

export function SignOutButton() {
  const onSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/home";
  };

  return (
    <button type="button" onClick={onSignOut} className="rounded-lg bg-zinc-900 px-4 py-2 text-white">
      Chiqish
    </button>
  );
}
