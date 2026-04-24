-- Ensure all couriers linked to a restaurant can access unassigned ready orders.
-- This prevents "only one courier sees the order" when multiple couriers are attached.

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
        and orders.status in ('ready', 'ready_for_pickup')
        and exists (
          select 1
          from public.restaurant_couriers rc
          where rc.courier_id = auth.uid()
            and rc.restaurant_id = orders.restaurant_id
            and rc.active = true
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
        and orders.status in ('ready', 'ready_for_pickup')
        and exists (
          select 1
          from public.restaurant_couriers rc
          where rc.courier_id = auth.uid()
            and rc.restaurant_id = orders.restaurant_id
            and rc.active = true
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
        and orders.status in ('ready', 'ready_for_pickup')
        and exists (
          select 1
          from public.restaurant_couriers rc
          where rc.courier_id = auth.uid()
            and rc.restaurant_id = orders.restaurant_id
            and rc.active = true
        )
      )
    )
  )
);
