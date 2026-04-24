-- Category cards on customer home.

alter table public.categories
  add column if not exists image_url text;
