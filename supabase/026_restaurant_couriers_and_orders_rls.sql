-- Restaurant-managed couriers mapping.
create table if not exists public.restaurant_couriers (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  courier_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, courier_id)
);

create unique index if not exists idx_restaurant_couriers_courier on public.restaurant_couriers (courier_id);
create index if not exists idx_restaurant_couriers_restaurant on public.restaurant_couriers (restaurant_id);

alter table public.restaurant_couriers enable row level security;

drop policy if exists "restaurant_couriers_restaurant_read" on public.restaurant_couriers;
create policy "restaurant_couriers_restaurant_read" on public.restaurant_couriers
for select using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_couriers.restaurant_id
        and r.owner_id = auth.uid()
    )
  )
  or (public.current_role() = 'courier' and restaurant_couriers.courier_id = auth.uid())
);

drop policy if exists "restaurant_couriers_restaurant_manage" on public.restaurant_couriers;
create policy "restaurant_couriers_restaurant_manage" on public.restaurant_couriers
for all using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_couriers.restaurant_id
        and r.owner_id = auth.uid()
    )
  )
)
with check (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_couriers.restaurant_id
        and r.owner_id = auth.uid()
    )
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
    and orders.courier_id = auth.uid()
    and exists (
      select 1
      from public.restaurant_couriers rc
      where rc.courier_id = auth.uid()
        and rc.restaurant_id = orders.restaurant_id
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
    and orders.courier_id = auth.uid()
    and exists (
      select 1
      from public.restaurant_couriers rc
      where rc.courier_id = auth.uid()
        and rc.restaurant_id = orders.restaurant_id
    )
  )
)
with check (
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
    and orders.courier_id = auth.uid()
    and exists (
      select 1
      from public.restaurant_couriers rc
      where rc.courier_id = auth.uid()
        and rc.restaurant_id = orders.restaurant_id
    )
  )
);

grant select, insert, update, delete on public.restaurant_couriers to authenticated;
