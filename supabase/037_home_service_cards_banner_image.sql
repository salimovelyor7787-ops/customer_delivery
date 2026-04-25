-- Add separate banner image for search page category cards.

alter table public.home_service_cards
  add column if not exists banner_image_url text;
