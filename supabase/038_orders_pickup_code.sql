-- Simple 4-digit pickup code shared between restaurant and courier.

alter table public.orders
  add column if not exists pickup_code text;

alter table public.orders
  drop constraint if exists orders_pickup_code_format;

alter table public.orders
  add constraint orders_pickup_code_format
  check (pickup_code is null or pickup_code ~ '^[0-9]{4}$');
