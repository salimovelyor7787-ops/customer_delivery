-- Allow flexible home category keys (flowers, groceries, etc).

alter table public.home_service_cards
  drop constraint if exists home_service_cards_service_key_check;

insert into public.home_service_cards (service_key, title, image_url, sort_order, is_active)
values
  ('flowers', 'Gullar', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&q=80', 3, true),
  ('groceries', 'Mahsulotlar', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80', 4, true)
on conflict (service_key) do nothing;
