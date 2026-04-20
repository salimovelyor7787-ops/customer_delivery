-- Allow restaurant owners and admins to read order line items for their orders (kitchen / panel).

drop policy if exists "order_items_select_restaurant_owner" on public.order_items;
create policy "order_items_select_restaurant_owner"
  on public.order_items
  for select
  to authenticated
  using (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.orders o
      join public.restaurants r on r.id = o.restaurant_id
      where o.id = order_items.order_id
        and r.owner_id = auth.uid()
    )
  );

drop policy if exists "order_items_select_admin" on public.order_items;
create policy "order_items_select_admin"
  on public.order_items
  for select
  to authenticated
  using (public.current_role() = 'admin');
