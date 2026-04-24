-- Store customer phone snapshot directly in orders for restaurant/courier communication.
alter table public.orders
  add column if not exists customer_phone text;

-- Backfill from guest phone where available.
update public.orders
set customer_phone = coalesce(customer_phone, guest_phone)
where customer_phone is null
  and guest_phone is not null;
