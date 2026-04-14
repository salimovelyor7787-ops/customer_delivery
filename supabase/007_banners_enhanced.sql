-- Extend banners so admin can control copy + button destination.

alter table if exists public.banners
  add column if not exists subtitle text,
  add column if not exists button_text text,
  add column if not exists action_path text,
  add column if not exists sort_order int not null default 0;

create index if not exists idx_banners_sort_order on public.banners (sort_order);

update public.banners
set subtitle = coalesce(subtitle, ''),
    button_text = coalesce(button_text, 'Ko''rish'),
    action_path = coalesce(action_path, '/search')
where true;
