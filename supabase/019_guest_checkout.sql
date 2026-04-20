-- Guest checkout support: allow orders without account/address and store phone+geo.
alter table public.orders
  alter column user_id drop not null,
  alter column address_id drop not null;

alter table public.orders
  add column if not exists guest_phone text,
  add column if not exists guest_lat double precision,
  add column if not exists guest_lng double precision,
  add column if not exists guest_device_id text;

create index if not exists idx_orders_guest_device_created
  on public.orders (guest_device_id, created_at desc)
  where guest_device_id is not null;
