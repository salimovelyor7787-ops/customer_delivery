-- Dispatch mode:
-- true  -> auto assign restaurant orders to own couriers
-- false -> keep ready orders in common courier pool
alter table public.restaurants
  add column if not exists auto_assign_to_own_couriers boolean not null default true;

-- Courier visibility for orders:
-- - own assigned orders are always visible
-- - unassigned ready orders become visible to all couriers only when restaurant has common pool mode
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
    and (
      orders.courier_id = auth.uid()
      or (
        orders.courier_id is null
        and orders.status = 'ready'
        and exists (
          select 1
          from public.restaurants r
          where r.id = orders.restaurant_id
            and r.auto_assign_to_own_couriers = false
        )
      )
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
    and (
      orders.courier_id = auth.uid()
      or (
        orders.courier_id is null
        and orders.status = 'ready'
        and exists (
          select 1
          from public.restaurants r
          where r.id = orders.restaurant_id
            and r.auto_assign_to_own_couriers = false
        )
      )
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
    and (
      orders.courier_id = auth.uid()
      or (
        orders.courier_id is null
        and orders.status = 'ready'
        and exists (
          select 1
          from public.restaurants r
          where r.id = orders.restaurant_id
            and r.auto_assign_to_own_couriers = false
        )
      )
    )
  )
);
