-- =============================================================================
-- Схема + RLS для доставки еды (Supabase).
-- Выполните в SQL Editor целиком или разбейте по блокам при ошибках "already exists".
-- Создание заказов из клиента — через Edge Function (service_role обходит RLS).
-- =============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Таблицы
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('customer', 'courier', 'restaurant', 'admin')),
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sort_order int default 0
);

create table if not exists public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references public.categories (id),
  name text not null,
  slug text unique,
  image_url text,
  is_open boolean default false,
  delivery_fee_cents int not null default 0,
  min_order_cents int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.menu_items (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  price_cents int not null,
  is_available boolean default true,
  sort_order int default 0
);

create table if not exists public.menu_item_options (
  id uuid primary key default uuid_generate_v4(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  name text not null,
  price_delta_cents int not null default 0
);

create table if not exists public.addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  line1 text not null,
  line2 text,
  city text not null,
  lat double precision,
  lng double precision,
  is_default boolean default false
);

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id),
  restaurant_id uuid not null references public.restaurants (id),
  address_id uuid not null references public.addresses (id),
  courier_id uuid references public.profiles (id),
  status text not null default 'placed',
  payment_method text not null,
  subtotal_cents int not null,
  delivery_fee_cents int not null,
  tax_cents int not null default 0,
  total_cents int not null,
  created_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id),
  quantity int not null,
  unit_price_cents int not null,
  selected_option_ids uuid[] default '{}'
);

create table if not exists public.courier_locations (
  order_id uuid primary key references public.orders (id) on delete cascade,
  courier_id uuid references public.profiles (id),
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Индексы
-- ---------------------------------------------------------------------------

create index if not exists idx_restaurants_category on public.restaurants (category_id);
create index if not exists idx_menu_items_restaurant on public.menu_items (restaurant_id);
create index if not exists idx_menu_item_options_item on public.menu_item_options (menu_item_id);
create index if not exists idx_addresses_user on public.addresses (user_id);
create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_courier on public.orders (courier_id);
create index if not exists idx_order_items_order on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Триггер: профиль при регистрации (роль customer)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'customer',
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Запрет смены role из клиента (JWT). Смена роли — из SQL Editor под postgres (auth.uid() обычно null).
create or replace function public.profiles_prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if old.role is distinct from new.role and auth.uid() is not null then
    raise exception 'Changing role is not allowed from the client';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row execute procedure public.profiles_prevent_role_change();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_options enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.courier_locations enable row level security;

-- --- profiles ---
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own_customer" on public.profiles;
create policy "profiles_insert_own_customer"
  on public.profiles for insert
  to authenticated
  with check (
    id = auth.uid()
    and role = 'customer'
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Курьер / ресторан / админ: чужие профили не открываем (при необходимости добавьте отдельные политики)

-- --- Каталог: только авторизованные (смените на anon при гостевом просмотре) ---
drop policy if exists "categories_select_auth" on public.categories;
create policy "categories_select_auth"
  on public.categories for select
  to authenticated
  using (true);

drop policy if exists "restaurants_select_auth" on public.restaurants;
create policy "restaurants_select_auth"
  on public.restaurants for select
  to authenticated
  using (true);

drop policy if exists "menu_items_select_auth" on public.menu_items;
create policy "menu_items_select_auth"
  on public.menu_items for select
  to authenticated
  using (true);

drop policy if exists "menu_item_options_select_auth" on public.menu_item_options;
create policy "menu_item_options_select_auth"
  on public.menu_item_options for select
  to authenticated
  using (true);

-- --- Адреса: только владелец ---
drop policy if exists "addresses_select_own" on public.addresses;
create policy "addresses_select_own"
  on public.addresses for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "addresses_insert_own" on public.addresses;
create policy "addresses_insert_own"
  on public.addresses for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "addresses_update_own" on public.addresses;
create policy "addresses_update_own"
  on public.addresses for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "addresses_delete_own" on public.addresses;
create policy "addresses_delete_own"
  on public.addresses for delete
  to authenticated
  using (user_id = auth.uid());

-- --- Заказы: клиент только читает свои (создание — Edge Function + service_role) ---
drop policy if exists "orders_select_own_customer" on public.orders;
create policy "orders_select_own_customer"
  on public.orders for select
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'customer'
    )
  );

drop policy if exists "orders_select_assigned_courier" on public.orders;
create policy "orders_select_assigned_courier"
  on public.orders for select
  to authenticated
  using (
    courier_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'courier'
    )
  );

-- Позиции заказа: клиент — только по своим заказам
drop policy if exists "order_items_select_customer" on public.order_items;
create policy "order_items_select_customer"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

drop policy if exists "order_items_select_courier" on public.order_items;
create policy "order_items_select_courier"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.courier_id = auth.uid()
    )
  );

-- Координаты курьера: клиент — заказ свой; курьер — свой заказ
drop policy if exists "courier_locations_select_customer" on public.courier_locations;
create policy "courier_locations_select_customer"
  on public.courier_locations for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = courier_locations.order_id
        and o.user_id = auth.uid()
    )
  );

drop policy if exists "courier_locations_select_courier" on public.courier_locations;
create policy "courier_locations_select_courier"
  on public.courier_locations for select
  to authenticated
  using (courier_id = auth.uid());

drop policy if exists "courier_locations_upsert_courier" on public.courier_locations;
create policy "courier_locations_upsert_courier"
  on public.courier_locations for insert
  to authenticated
  with check (
    courier_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'courier'
    )
    and exists (
      select 1 from public.orders o
      where o.id = courier_locations.order_id
        and o.courier_id = auth.uid()
    )
  );

drop policy if exists "courier_locations_update_courier" on public.courier_locations;
create policy "courier_locations_update_courier"
  on public.courier_locations for update
  to authenticated
  using (courier_id = auth.uid())
  with check (courier_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime: включите репликацию для таблиц в Dashboard → Database → Replication
-- ---------------------------------------------------------------------------
-- alter publication supabase_realtime add table public.orders;
-- alter publication supabase_realtime add table public.courier_locations;

-- ---------------------------------------------------------------------------
-- Права (на всякий случай)
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.addresses to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update on public.courier_locations to authenticated;

-- orders / order_items: у authenticated только SELECT (через RLS). INSERT — Edge Function (service_role).

-- Гостевой каталог: раскомментируйте и добавьте политики ... to anon using (true) для categories/restaurants/menu_*
-- grant usage on schema public to anon;
-- grant select on public.categories, public.restaurants, public.menu_items, public.menu_item_options to anon;
