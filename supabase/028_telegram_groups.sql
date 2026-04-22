-- Telegram group -> restaurant mapping for universal menu bot.

create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  chat_id bigint not null unique,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_groups_restaurant_id on public.groups (restaurant_id);
