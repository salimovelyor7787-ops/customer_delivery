-- Allow app users to read promo-related content for notifications screen.

drop policy if exists "promocodes_read_by_roles" on public.promocodes;
create policy "promocodes_read_by_roles" on public.promocodes
for select using (public.current_role() in ('admin', 'restaurant', 'courier', 'customer'));

drop policy if exists "banners_read_by_roles" on public.banners;
create policy "banners_read_by_roles" on public.banners
for select using (public.current_role() in ('admin', 'restaurant', 'courier', 'customer'));
