-- Reference schema for shared delivery backend (customer / courier / restaurant / admin apps).
-- Apply via Supabase SQL editor or migrations; tighten RLS for production.

create extension if not exists "uuid-ossp";

-- Profiles mirror auth.users; role gates app access.
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

-- Courier location broadcast (realtime). Courier apps upsert; customers subscribe with RLS.
create table if not exists public.courier_locations (
  order_id uuid primary key references public.orders (id) on delete cascade,
  courier_id uuid references public.profiles (id),
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz default now()
);

-- Enable replication in Dashboard → Database → Replication, or:
-- alter publication supabase_realtime add table public.orders;
-- alter publication supabase_realtime add table public.courier_locations;

-- Example RLS (extend per app / role):
-- alter table public.profiles enable row level security;
-- create policy "read own profile" on public.profiles for select using (auth.uid() = id);
