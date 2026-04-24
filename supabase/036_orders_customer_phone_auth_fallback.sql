-- Improve customer phone autofill for authenticated users.
-- Fallback priority:
-- 1) orders.customer_phone (already provided)
-- 2) orders.guest_phone
-- 3) profiles.phone
-- 4) auth.users.phone
-- 5) auth.users.raw_user_meta_data->>'phone'

create or replace function public.fill_order_customer_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_phone text;
  auth_phone text;
  auth_meta_phone text;
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
      else
        select u.phone, u.raw_user_meta_data->>'phone'
        into auth_phone, auth_meta_phone
        from auth.users u
        where u.id = new.user_id
        limit 1;

        if auth_phone is not null and btrim(auth_phone) <> '' then
          new.customer_phone := auth_phone;
        elsif auth_meta_phone is not null and btrim(auth_meta_phone) <> '' then
          new.customer_phone := auth_meta_phone;
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Recreate trigger to ensure latest function body is used.
drop trigger if exists trg_orders_fill_customer_phone on public.orders;
create trigger trg_orders_fill_customer_phone
before insert or update on public.orders
for each row execute function public.fill_order_customer_phone();

-- Backfill existing rows from strongest available source.
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

update public.orders o
set customer_phone = u.phone
from auth.users u
where (o.customer_phone is null or btrim(o.customer_phone) = '')
  and o.user_id = u.id
  and u.phone is not null
  and btrim(u.phone) <> '';

update public.orders o
set customer_phone = u.raw_user_meta_data->>'phone'
from auth.users u
where (o.customer_phone is null or btrim(o.customer_phone) = '')
  and o.user_id = u.id
  and (u.raw_user_meta_data->>'phone') is not null
  and btrim(u.raw_user_meta_data->>'phone') <> '';
