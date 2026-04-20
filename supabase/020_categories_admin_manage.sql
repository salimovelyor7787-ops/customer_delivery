-- Allow admin panel to manage home filter categories.
alter table if exists public.categories enable row level security;

drop policy if exists "categories_admin_manage" on public.categories;
create policy "categories_admin_manage" on public.categories
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
