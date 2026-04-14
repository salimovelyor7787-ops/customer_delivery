/**
 * Rollar `public.profiles` jadvalida: `customer` | `courier` | `restaurant` | `admin`
 *
 * Ro'yxatdan o'tganda `handle_new_user` triggeri avvalo **`customer`** rolini beradi.
 * `admin` / `restaurant` / `courier` rollarini Supabase-da qo'lda belgilash kerak.
 */
export const BACKEND_PROFILE_ROLES = ["customer", "courier", "restaurant", "admin"] as const;
export type BackendProfileRole = (typeof BACKEND_PROFILE_ROLES)[number];

/** Kirishdan keyin rol bo'yicha yo'naltirish. */
export function pathAfterAuth(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "restaurant") return "/restaurant";
  if (role === "courier") return "/courier";
  return "/no-access";
}
