-- Menu item category for admin-managed grouped menu UI.

alter table if exists public.menu_items
  add column if not exists category text;

update public.menu_items
set category = 'Boshqa'
where category is null or btrim(category) = '';

alter table if exists public.menu_items
  alter column category set default 'Boshqa';
