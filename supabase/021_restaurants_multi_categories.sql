-- Allow assigning multiple categories to each restaurant.
-- Keep legacy `category_id` as first selected category for backward compatibility.

alter table if exists public.restaurants
  add column if not exists category_ids uuid[] not null default '{}';

update public.restaurants
set category_ids = case
  when category_id is null then '{}'
  else array[category_id]
end
where category_ids = '{}'::uuid[];

create index if not exists idx_restaurants_category_ids on public.restaurants using gin (category_ids);
