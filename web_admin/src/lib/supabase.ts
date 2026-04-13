import { createBrowserClient } from "@supabase/ssr";

export type UserRole = "admin" | "restaurant" | "courier";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    // During server prerender of client modules on Vercel, env can be unavailable at build-time.
    // Return a harmless placeholder client so the build can complete; real browser runtime still needs env vars.
    if (typeof window === "undefined") {
      return createBrowserClient("https://placeholder.supabase.co", "placeholder-anon-key");
    }
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}

export function roleHomePath(role: UserRole) {
  if (role === "admin") return "/admin";
  if (role === "restaurant") return "/restaurant";
  return "/courier";
}
