-- Allow admin/restaurant owner to manage menu item options (add-ons).

alter table if exists public.menu_item_options enable row level security;

drop policy if exists "menu_item_options_manage_own" on public.menu_item_options;
create policy "menu_item_options_manage_own" on public.menu_item_options
for all using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'restaurant'
    and exists (
      select 1
      from public.menu_items mi
      join public.restaurants r on r.id = mi.restaurant_id
      where mi.id = menu_item_options.menu_item_id
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
      from public.menu_items mi
      join public.restaurants r on r.id = mi.restaurant_id
      where mi.id = menu_item_options.menu_item_id
        and r.owner_id = auth.uid()
    )
  )
);
