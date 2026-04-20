-- Per-restaurant menu categories with owner/admin management.

create table if not exists public.menu_categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create index if not exists idx_menu_categories_restaurant on public.menu_categories (restaurant_id, sort_order, name);

-- Seed from existing menu item category values.
insert into public.menu_categories (restaurant_id, name)
select mi.restaurant_id, btrim(mi.category) as name
from public.menu_items mi
where mi.category is not null
  and btrim(mi.category) <> ''
on conflict (restaurant_id, name) do nothing;

-- Ensure fallback category exists for each restaurant with any menu items.
insert into public.menu_categories (restaurant_id, name)
select distinct mi.restaurant_id, 'Boshqa'
from public.menu_items mi
on conflict (restaurant_id, name) do nothing;

alter table if exists public.menu_categories enable row level security;

drop policy if exists "menu_categories_read_by_roles" on public.menu_categories;
create policy "menu_categories_read_by_roles" on public.menu_categories
for select using (public.current_role() in ('admin', 'restaurant', 'courier'));

drop policy if exists "menu_categories_manage_own" on public.menu_categories;
create policy "menu_categories_manage_own" on public.menu_categories
for all using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.restaurants r
      where r.id = menu_categories.restaurant_id and r.owner_id = auth.uid()
    )
  )
)
with check (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.restaurants r
      where r.id = menu_categories.restaurant_id and r.owner_id = auth.uid()
    )
  )
);
