-- Sorting support for menu item add-ons in admin panel.

alter table if exists public.menu_item_options
  add column if not exists sort_order int not null default 0;

with ordered as (
  select
    id,
    row_number() over (partition by menu_item_id order by name, id) - 1 as next_sort
  from public.menu_item_options
)
update public.menu_item_options mio
set sort_order = ordered.next_sort
from ordered
where ordered.id = mio.id;

create index if not exists idx_menu_item_options_item_sort
  on public.menu_item_options (menu_item_id, sort_order, name);
