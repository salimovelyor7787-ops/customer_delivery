-- Atomic order creation RPC to reduce DB round-trips under high concurrency.
-- Performs validation, pricing, promo resolution, order insert and order_items bulk insert in one DB call.

create or replace function public.create_order_atomic(
  p_user_id uuid,
  p_restaurant_id uuid,
  p_address_id uuid,
  p_payment_method text,
  p_guest_phone text,
  p_guest_lat double precision,
  p_guest_lng double precision,
  p_guest_device_id text,
  p_promo_code text,
  p_client_request_id text,
  p_pickup_code text,
  p_items jsonb
)
returns table (
  order_id uuid,
  total_cents int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant record;
  v_subtotal int := 0;
  v_delivery int := 0;
  v_tax int := 0;
  v_total int := 0;
  v_discount int := 0;
  v_promocode_id uuid := null;
  v_promo_code text := null;
  v_phone text := null;
  v_existing_id uuid := null;
  v_promo record;
begin
  if p_restaurant_id is null or p_payment_method is null or btrim(p_payment_method) = '' then
    raise exception 'BAD_REQUEST: Invalid payload';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'BAD_REQUEST: Order items are required';
  end if;

  if p_client_request_id is null or btrim(p_client_request_id) = '' or length(p_client_request_id) > 120 then
    raise exception 'BAD_REQUEST: request_id is required';
  end if;

  if p_user_id is null then
    if p_guest_phone is null or btrim(p_guest_phone) = '' then
      raise exception 'BAD_REQUEST: Phone is required';
    end if;
    if p_guest_lat is null or p_guest_lng is null or p_guest_device_id is null or btrim(p_guest_device_id) = '' then
      raise exception 'BAD_REQUEST: Guest checkout requires phone and location';
    end if;
    v_phone := btrim(p_guest_phone);
  else
    if not exists (
      select 1
      from public.profiles p
      where p.id = p_user_id and p.role = 'customer'
    ) then
      raise exception 'FORBIDDEN: Invalid user role';
    end if;

    if p_address_id is not null and not exists (
      select 1
      from public.addresses a
      where a.id = p_address_id and a.user_id = p_user_id
    ) then
      raise exception 'BAD_REQUEST: Invalid address';
    end if;

    v_phone := nullif(btrim(coalesce(p_guest_phone, '')), '');
  end if;

  select r.id, r.delivery_fee_cents, r.min_order_cents, r.is_open
  into v_restaurant
  from public.restaurants r
  where r.id = p_restaurant_id
  limit 1;

  if not found then
    raise exception 'NOT_FOUND: Restaurant not found';
  end if;

  if coalesce(v_restaurant.is_open, false) = false then
    raise exception 'BAD_REQUEST: Restaurant is closed';
  end if;

  create temporary table if not exists _order_input_items (
    menu_item_id uuid,
    quantity int,
    selected_option_ids jsonb not null
  ) on commit drop;
  truncate _order_input_items;

  insert into _order_input_items (menu_item_id, quantity, selected_option_ids)
  select
    i.menu_item_id,
    i.quantity,
    coalesce(i.selected_option_ids, '[]'::jsonb)
  from jsonb_to_recordset(p_items) as i(menu_item_id uuid, quantity int, selected_option_ids jsonb);

  if exists (
    select 1
    from _order_input_items i
    where i.menu_item_id is null or coalesce(i.quantity, 0) < 1
  ) then
    raise exception 'BAD_REQUEST: Invalid line item';
  end if;

  -- Validate menu item coverage and availability.
  if (
    select count(*)
    from (
      select distinct i.menu_item_id
      from _order_input_items i
    ) req
    left join public.menu_items mi
      on mi.id = req.menu_item_id
    where mi.id is null
      or mi.restaurant_id <> p_restaurant_id
      or coalesce(mi.is_available, false) = false
  ) > 0 then
    raise exception 'BAD_REQUEST: Invalid menu item';
  end if;

  -- Validate selected options in batch (no per-item loops).
  if exists (
    with req_options as (
      select i.menu_item_id, (opt.value)::uuid as option_id
      from _order_input_items i
      join lateral jsonb_array_elements_text(coalesce(i.selected_option_ids, '[]'::jsonb)) opt(value) on true
    )
    select 1
    from req_options ro
    left join public.menu_item_options o
      on o.id = ro.option_id
     and o.menu_item_id = ro.menu_item_id
    where o.id is null
    limit 1
  ) then
    raise exception 'BAD_REQUEST: Option mismatch';
  end if;

  -- Price lines once and reuse for subtotal + order_items insert.
  create temporary table if not exists _order_priced_lines (
    menu_item_id uuid not null,
    quantity int not null,
    unit_price_cents int not null,
    selected_option_ids uuid[] not null
  ) on commit drop;
  truncate _order_priced_lines;

  insert into _order_priced_lines (menu_item_id, quantity, unit_price_cents, selected_option_ids)
  with option_totals as (
    select
      i.menu_item_id,
      i.quantity,
      i.selected_option_ids,
      coalesce(sum(o.price_delta_cents), 0)::int as option_delta_cents
    from _order_input_items i
    left join lateral (
      select moo.price_delta_cents
      from jsonb_array_elements_text(i.selected_option_ids) t(option_id)
      join public.menu_item_options moo on moo.id = (t.option_id)::uuid
    ) o on true
    group by i.menu_item_id, i.quantity, i.selected_option_ids
  )
  select
    ot.menu_item_id,
    ot.quantity,
    (mi.price_cents + ot.option_delta_cents)::int as unit_price_cents,
    coalesce(array(
      select (x.value)::uuid
      from jsonb_array_elements_text(ot.selected_option_ids) x(value)
    ), '{}'::uuid[]) as selected_option_ids
  from option_totals ot
  join public.menu_items mi on mi.id = ot.menu_item_id;

  select coalesce(sum(pl.unit_price_cents * pl.quantity), 0)::int
  into v_subtotal
  from _order_priced_lines pl;

  v_delivery := coalesce(v_restaurant.delivery_fee_cents, 0);
  v_tax := 0;

  if v_subtotal < coalesce(v_restaurant.min_order_cents, 0) then
    raise exception 'BAD_REQUEST: Below minimum order';
  end if;

  -- Promo resolution (first_order uses EXISTS, not COUNT(*)).
  if p_promo_code is not null and btrim(p_promo_code) <> '' then
    select
      pr.id,
      pr.discount,
      pr.discount_fixed_cents,
      pr.restaurant_id,
      pr.audience,
      pr.min_subtotal_cents,
      pr.expires_at
    into v_promo
    from public.promocodes pr
    where pr.code = upper(btrim(p_promo_code))
      and pr.active = true
    limit 1;

    if not found then
      raise exception 'BAD_REQUEST: Invalid promo code';
    end if;

    if v_promo.expires_at is not null and v_promo.expires_at <= now() then
      raise exception 'BAD_REQUEST: Promo code expired';
    end if;

    if v_promo.restaurant_id is not null and v_promo.restaurant_id <> p_restaurant_id then
      raise exception 'BAD_REQUEST: Promo not valid for this restaurant';
    end if;

    if coalesce(v_promo.min_subtotal_cents, 0) > v_subtotal then
      raise exception 'BAD_REQUEST: Order subtotal below promo minimum';
    end if;

    if v_promo.audience = 'first_order' then
      if p_user_id is null then
        raise exception 'BAD_REQUEST: This promo requires a signed-in account';
      end if;
      if exists (
        select 1
        from public.orders o
        where o.user_id = p_user_id
        limit 1
      ) then
        raise exception 'BAD_REQUEST: Promo only for first order';
      end if;
    end if;

    if v_promo.discount_fixed_cents is not null and v_promo.discount_fixed_cents > 0 then
      v_discount := least(v_promo.discount_fixed_cents, v_subtotal);
    else
      v_discount := floor((v_subtotal * coalesce(v_promo.discount, 0)) / 100.0)::int;
    end if;

    v_promocode_id := v_promo.id;
    v_promo_code := upper(btrim(p_promo_code));
  end if;

  v_total := greatest(0, v_subtotal - v_discount + v_delivery + v_tax);

  -- Idempotency fast path.
  select o.id into v_existing_id
  from public.orders o
  where o.client_request_id = p_client_request_id
  limit 1;

  if v_existing_id is not null then
    order_id := v_existing_id;
    total_cents := v_total;
    return next;
    return;
  end if;

  -- Atomic insert for order + order_items.
  begin
    insert into public.orders (
      user_id,
      restaurant_id,
      address_id,
      status,
      payment_method,
      guest_phone,
      customer_phone,
      guest_lat,
      guest_lng,
      guest_device_id,
      subtotal_cents,
      delivery_fee_cents,
      tax_cents,
      total_cents,
      promo_code,
      promocode_id,
      promo_discount_cents,
      client_request_id,
      pickup_code
    )
    values (
      p_user_id,
      p_restaurant_id,
      p_address_id,
      'placed',
      p_payment_method,
      nullif(btrim(coalesce(p_guest_phone, '')), ''),
      v_phone,
      p_guest_lat,
      p_guest_lng,
      case when p_user_id is null then nullif(btrim(coalesce(p_guest_device_id, '')), '') else null end,
      v_subtotal,
      v_delivery,
      v_tax,
      v_total,
      v_promo_code,
      v_promocode_id,
      v_discount,
      p_client_request_id,
      p_pickup_code
    )
    returning id into v_existing_id;
  exception
    when unique_violation then
      select o.id into v_existing_id
      from public.orders o
      where o.client_request_id = p_client_request_id
      limit 1;
  end;

  if v_existing_id is null then
    raise exception 'INTERNAL: Could not create order';
  end if;

  insert into public.order_items (
    order_id,
    menu_item_id,
    quantity,
    unit_price_cents,
    selected_option_ids
  )
  select
    v_existing_id,
    pl.menu_item_id,
    pl.quantity,
    pl.unit_price_cents,
    pl.selected_option_ids
  from _order_priced_lines pl;

  order_id := v_existing_id;
  total_cents := v_total;
  return next;
end;
$$;

grant execute on function public.create_order_atomic(
  uuid,
  uuid,
  uuid,
  text,
  text,
  double precision,
  double precision,
  text,
  text,
  text,
  text,
  jsonb
) to service_role;
