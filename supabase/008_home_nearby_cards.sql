-- Home "Nearby stores" cards managed by admin.

create table if not exists public.home_nearby_cards (
  id uuid primary key default uuid_generate_v4(),
  title text,
  image_url text not null,
  restaurant_id uuid references public.restaurants (id) on delete set null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_home_nearby_cards_sort on public.home_nearby_cards (sort_order);
create index if not exists idx_home_nearby_cards_restaurant on public.home_nearby_cards (restaurant_id);

drop trigger if exists trg_home_nearby_cards_updated_at on public.home_nearby_cards;
create trigger trg_home_nearby_cards_updated_at
before update on public.home_nearby_cards
for each row execute function public.set_updated_at();

alter table if exists public.home_nearby_cards enable row level security;

drop policy if exists "home_nearby_cards_read_public" on public.home_nearby_cards;
create policy "home_nearby_cards_read_public" on public.home_nearby_cards
for select using (true);

drop policy if exists "home_nearby_cards_admin_manage" on public.home_nearby_cards;
create policy "home_nearby_cards_admin_manage" on public.home_nearby_cards
for all using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
