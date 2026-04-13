create extension if not exists "uuid-ossp";

-- Optional admin entities for web_admin
create table if not exists public.promocodes (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  discount int not null check (discount > 0 and discount <= 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default uuid_generate_v4(),
  image_url text not null,
  title text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Restaurant ownership used by role-based panels
alter table public.restaurants add column if not exists owner_id uuid references auth.users (id);

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

alter table if exists public.profiles enable row level security;
alter table if exists public.restaurants enable row level security;
alter table if exists public.menu_items enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.promocodes enable row level security;
alter table if exists public.banners enable row level security;

drop policy if exists "profiles_self_or_admin_read" on public.profiles;
create policy "profiles_self_or_admin_read" on public.profiles
for select using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
for update using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "restaurants_read_all_roles" on public.restaurants;
create policy "restaurants_read_all_roles" on public.restaurants
for select using (public.current_role() in ('admin', 'restaurant', 'courier'));

drop policy if exists "restaurants_admin_manage" on public.restaurants;
create policy "restaurants_admin_manage" on public.restaurants
for all using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "restaurants_restaurant_owner_read" on public.restaurants;
create policy "restaurants_restaurant_owner_read" on public.restaurants
for select using (public.current_role() = 'restaurant' and owner_id = auth.uid());

drop policy if exists "menu_items_read_by_roles" on public.menu_items;
create policy "menu_items_read_by_roles" on public.menu_items
for select using (public.current_role() in ('admin', 'restaurant', 'courier'));

drop policy if exists "menu_items_restaurant_manage_own" on public.menu_items;
create policy "menu_items_restaurant_manage_own" on public.menu_items
for all using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.restaurants r
      where r.id = menu_items.restaurant_id and r.owner_id = auth.uid()
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
      where r.id = menu_items.restaurant_id and r.owner_id = auth.uid()
    )
  )
);

drop policy if exists "orders_access_by_role" on public.orders;
create policy "orders_access_by_role" on public.orders
for select using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.restaurants r
      where r.id = orders.restaurant_id and r.owner_id = auth.uid()
    )
  )
  or (public.current_role() = 'courier' and (orders.courier_id = auth.uid() or orders.courier_id is null))
);

drop policy if exists "orders_update_by_role" on public.orders;
create policy "orders_update_by_role" on public.orders
for update using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.restaurants r
      where r.id = orders.restaurant_id and r.owner_id = auth.uid()
    )
  )
  or (public.current_role() = 'courier' and (orders.courier_id = auth.uid() or orders.courier_id is null))
)
with check (true);

drop policy if exists "promocodes_admin_manage" on public.promocodes;
create policy "promocodes_admin_manage" on public.promocodes
for all using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "banners_admin_manage" on public.banners;
create policy "banners_admin_manage" on public.banners
for all using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

-- Storage: product-images bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_read_public" on storage.objects;
create policy "product_images_read_public" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "product_images_restaurant_upload" on storage.objects;
create policy "product_images_restaurant_upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and public.current_role() in ('admin', 'restaurant')
);

drop policy if exists "product_images_restaurant_update" on storage.objects;
create policy "product_images_restaurant_update" on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and public.current_role() in ('admin', 'restaurant'))
with check (bucket_id = 'product-images' and public.current_role() in ('admin', 'restaurant'));

drop policy if exists "product_images_restaurant_delete" on storage.objects;
create policy "product_images_restaurant_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and public.current_role() in ('admin', 'restaurant'));
