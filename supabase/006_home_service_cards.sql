-- Home service cards (stores/restaurants/courier) content managed from admin panel.

create table if not exists public.home_service_cards (
  id uuid primary key default uuid_generate_v4(),
  service_key text not null check (service_key in ('stores', 'restaurants', 'courier')),
  title text not null,
  image_url text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_key)
);

create index if not exists idx_home_service_cards_sort on public.home_service_cards (sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_home_service_cards_updated_at on public.home_service_cards;
create trigger trg_home_service_cards_updated_at
before update on public.home_service_cards
for each row execute function public.set_updated_at();

alter table if exists public.home_service_cards enable row level security;

drop policy if exists "home_service_cards_read_auth" on public.home_service_cards;
create policy "home_service_cards_read_auth" on public.home_service_cards
for select using (auth.role() in ('authenticated', 'anon'));

drop policy if exists "home_service_cards_admin_manage" on public.home_service_cards;
create policy "home_service_cards_admin_manage" on public.home_service_cards
for all using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

insert into public.home_service_cards (service_key, title, image_url, sort_order, is_active)
values
  ('stores', 'Do''konlar', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80', 0, true),
  ('restaurants', 'Restoranlar', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&q=80', 1, true),
  ('courier', 'Kuryer', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80', 2, true)
on conflict (service_key) do nothing;
