-- Deal fields for home "discounts and bonuses" carousel.

alter table if exists public.menu_items
  add column if not exists is_deal boolean not null default false,
  add column if not exists deal_price_cents int;

alter table if exists public.menu_items
  drop constraint if exists menu_items_deal_price_positive;

alter table if exists public.menu_items
  add constraint menu_items_deal_price_positive
  check (deal_price_cents is null or deal_price_cents > 0);

alter table if exists public.menu_items
  drop constraint if exists menu_items_deal_price_not_above_base;

alter table if exists public.menu_items
  add constraint menu_items_deal_price_not_above_base
  check (deal_price_cents is null or deal_price_cents <= price_cents);
