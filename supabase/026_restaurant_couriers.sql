-- Restaurant-managed couriers:
-- - restaurant can create/manage own couriers
-- - courier sees only orders of linked restaurant(s)

create table if not exists public.restaurant_couriers (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  courier_id uuid not null references public.profiles (id) on delete cascade,
  login_email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, courier_id),
  unique (courier_id)
);

create index if not exists idx_restaurant_couriers_restaurant on public.restaurant_couriers (restaurant_id);
create index if not exists idx_restaurant_couriers_courier on public.restaurant_couriers (courier_id);

alter table public.restaurant_couriers enable row level security;

drop policy if exists "restaurant_couriers_restaurant_manage" on public.restaurant_couriers;
create policy "restaurant_couriers_restaurant_manage" on public.restaurant_couriers
for all using (
  public.current_role() = 'restaurant'
  and exists (
    select 1
    from public.restaurants r
    where r.id = restaurant_couriers.restaurant_id and r.owner_id = auth.uid()
  )
)
with check (
  public.current_role() = 'restaurant'
  and exists (
    select 1
    from public.restaurants r
    where r.id = restaurant_couriers.restaurant_id and r.owner_id = auth.uid()
  )
);

drop policy if exists "restaurant_couriers_courier_read_own" on public.restaurant_couriers;
create policy "restaurant_couriers_courier_read_own" on public.restaurant_couriers
for select using (
  public.current_role() = 'courier'
  and courier_id = auth.uid()
  and active = true
);

-- Restaurants can read profiles of couriers assigned to their own restaurant.
drop policy if exists "profiles_restaurant_read_own_couriers" on public.profiles;
create policy "profiles_restaurant_read_own_couriers" on public.profiles
for select using (
  public.current_role() = 'restaurant'
  and exists (
    select 1
    from public.restaurant_couriers rc
    join public.restaurants r on r.id = rc.restaurant_id
    where rc.courier_id = profiles.id and rc.active = true and r.owner_id = auth.uid()
  )
);

-- Courier access to orders must be scoped to linked restaurant + assignment/null.
drop policy if exists "orders_select_assigned_courier" on public.orders;
drop policy if exists "orders_courier_select_scoped" on public.orders;
create policy "orders_courier_select_scoped" on public.orders
for select using (
  public.current_role() = 'courier'
  and (
    courier_id = auth.uid()
    or courier_id is null
  )
  and exists (
    select 1
    from public.restaurant_couriers rc
    where rc.courier_id = auth.uid() and rc.restaurant_id = orders.restaurant_id and rc.active = true
  )
);

drop policy if exists "orders_access_by_role" on public.orders;
create policy "orders_access_by_role" on public.orders
for select using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.restaurants r
      where r.id = orders.restaurant_id and r.owner_id = auth.uid()
    )
  )
  or (
    public.current_role() = 'courier'
    and (orders.courier_id = auth.uid() or orders.courier_id is null)
    and exists (
      select 1
      from public.restaurant_couriers rc
      where rc.courier_id = auth.uid() and rc.restaurant_id = orders.restaurant_id and rc.active = true
    )
  )
);

drop policy if exists "orders_update_by_role" on public.orders;
create policy "orders_update_by_role" on public.orders
for update using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.restaurants r
      where r.id = orders.restaurant_id and r.owner_id = auth.uid()
    )
  )
  or (
    public.current_role() = 'courier'
    and (orders.courier_id = auth.uid() or orders.courier_id is null)
    and exists (
      select 1
      from public.restaurant_couriers rc
      where rc.courier_id = auth.uid() and rc.restaurant_id = orders.restaurant_id and rc.active = true
    )
  )
)
with check (true);

-- Keep order_items readable for courier only within their linked restaurant scope.
drop policy if exists "order_items_select_courier" on public.order_items;
create policy "order_items_select_courier" on public.order_items
for select using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and public.current_role() = 'courier'
      and (o.courier_id = auth.uid() or o.courier_id is null)
      and exists (
        select 1
        from public.restaurant_couriers rc
        where rc.courier_id = auth.uid() and rc.restaurant_id = o.restaurant_id and rc.active = true
      )
  )
);
