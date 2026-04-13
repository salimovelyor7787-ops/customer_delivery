/**
 * Роли в бэкенде: таблица `public.profiles`, ограничение CHECK:
 * `customer` | `courier` | `restaurant` | `admin`
 *
 * При регистрации через Auth триггер `handle_new_user` создаёт профиль с ролью **`customer`**.
 * Роли `admin` / `restaurant` / `courier` назначаются вручную в Supabase (SQL Editor или Dashboard под service role),
 * с клиента смена `role` заблокирована триггером `profiles_prevent_role_change`.
 */
export const BACKEND_PROFILE_ROLES = ["customer", "courier", "restaurant", "admin"] as const;
export type BackendProfileRole = (typeof BACKEND_PROFILE_ROLES)[number];

/** Куда вести пользователя после входа по роли (панель или заглушка для customer). */
export function pathAfterAuth(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "restaurant") return "/restaurant";
  if (role === "courier") return "/courier";
  return "/no-access";
}
