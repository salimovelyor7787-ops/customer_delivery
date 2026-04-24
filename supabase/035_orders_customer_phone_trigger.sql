-- Keep customer_phone populated at DB level for all order writes.
-- This works even if an old app/edge function version inserts orders.

create or replace function public.fill_order_customer_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_phone text;
begin
  if new.customer_phone is null or btrim(new.customer_phone) = '' then
    if new.guest_phone is not null and btrim(new.guest_phone) <> '' then
      new.customer_phone := new.guest_phone;
    elsif new.user_id is not null then
      select p.phone into profile_phone
      from public.profiles p
      where p.id = new.user_id
      limit 1;

      if profile_phone is not null and btrim(profile_phone) <> '' then
        new.customer_phone := profile_phone;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_fill_customer_phone on public.orders;
create trigger trg_orders_fill_customer_phone
before insert or update on public.orders
for each row execute function public.fill_order_customer_phone();

-- Backfill existing rows where we can infer phone safely.
update public.orders o
set customer_phone = o.guest_phone
where (o.customer_phone is null or btrim(o.customer_phone) = '')
  and o.guest_phone is not null
  and btrim(o.guest_phone) <> '';

update public.orders o
set customer_phone = p.phone
from public.profiles p
where (o.customer_phone is null or btrim(o.customer_phone) = '')
  and o.user_id = p.id
  and p.phone is not null
  and btrim(p.phone) <> '';
