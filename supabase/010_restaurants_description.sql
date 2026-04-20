-- Add optional restaurant description for admin management.

alter table if exists public.restaurants
  add column if not exists description text;
