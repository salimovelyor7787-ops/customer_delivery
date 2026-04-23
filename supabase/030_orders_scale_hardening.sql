-- Hardening for order throughput and duplicate-submit resilience.

alter table public.orders
  add column if not exists client_request_id text;

create unique index if not exists idx_orders_client_request_id
  on public.orders (client_request_id)
  where client_request_id is not null;

create index if not exists idx_orders_restaurant_created_at
  on public.orders (restaurant_id, created_at desc);

create index if not exists idx_orders_restaurant_status_created_at
  on public.orders (restaurant_id, status, created_at desc);

create index if not exists idx_orders_status_courier_created_at
  on public.orders (status, courier_id, created_at desc);

create index if not exists idx_orders_created_at
  on public.orders (created_at desc);

create index if not exists idx_restaurants_owner_id
  on public.restaurants (owner_id);
