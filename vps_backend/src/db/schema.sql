create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('user', 'courier', 'admin')),
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_open boolean not null default false,
  image_url text,
  delivery_fee_cents int not null default 0,
  min_order_cents int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  price_cents int not null,
  is_available boolean not null default true
);

create table if not exists menu_item_options (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  name text not null,
  price_delta_cents int not null default 0
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null,
  line1 text not null,
  city text not null,
  lat double precision,
  lng double precision
);

create table if not exists promocodes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount int,
  discount_fixed_cents int,
  restaurant_id uuid references restaurants(id) on delete cascade,
  audience text not null default 'all' check (audience in ('all', 'first_order')),
  min_subtotal_cents int not null default 0,
  expires_at timestamptz,
  active boolean not null default true
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  restaurant_id uuid not null references restaurants(id),
  address_id uuid references addresses(id),
  courier_id uuid references users(id),
  status text not null default 'placed',
  payment_method text not null,
  guest_phone text,
  guest_lat double precision,
  guest_lng double precision,
  guest_device_id text,
  customer_phone text,
  subtotal_cents int not null,
  delivery_fee_cents int not null,
  tax_cents int not null default 0,
  total_cents int not null,
  promo_code text,
  promocode_id uuid references promocodes(id) on delete set null,
  promo_discount_cents int not null default 0,
  client_request_id text,
  pickup_code text,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  quantity int not null,
  unit_price_cents int not null,
  selected_option_ids uuid[] not null default '{}'
);

create table if not exists restaurant_couriers (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  courier_id uuid not null references users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, courier_id)
);

create table if not exists courier_locations (
  order_id uuid primary key references orders(id) on delete cascade,
  courier_id uuid references users(id),
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

create table if not exists order_events_outbox (
  id bigserial primary key,
  order_id uuid not null references orders(id) on delete cascade,
  event_type text not null check (event_type in ('notification', 'telegram', 'analytics')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts int not null default 0,
  error_message text,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_menu_items_restaurant on menu_items(restaurant_id);
create index if not exists idx_menu_item_options_item on menu_item_options(menu_item_id);
create index if not exists idx_addresses_user on addresses(user_id);
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_status_created_at on orders(status, created_at desc);
create index if not exists idx_orders_courier on orders(courier_id);
create index if not exists idx_orders_restaurant_created_at on orders(restaurant_id, created_at desc);
create index if not exists idx_orders_restaurant_status_created_at on orders(restaurant_id, status, created_at desc);
create index if not exists idx_orders_guest_device_created on orders(guest_device_id, created_at desc) where guest_device_id is not null;
create unique index if not exists idx_orders_client_request_id on orders(client_request_id) where client_request_id is not null;
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_promocodes_restaurant on promocodes(restaurant_id);
create index if not exists idx_order_events_outbox_pending on order_events_outbox(status, available_at, created_at) where status in ('pending','failed');
