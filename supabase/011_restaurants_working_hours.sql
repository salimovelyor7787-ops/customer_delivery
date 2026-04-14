-- Working hours for restaurants (local time, HH:MM).

alter table if exists public.restaurants
  add column if not exists open_time_from time,
  add column if not exists open_time_to time;
