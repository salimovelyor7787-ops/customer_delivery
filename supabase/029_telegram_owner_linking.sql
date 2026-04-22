-- Secure Telegram owner linking flow:
-- 1) restaurant owner generates one-time code in web_admin
-- 2) owner sends /start <code> to bot in private chat
-- 3) bot links telegram_user_id -> owner_id
-- 4) in groups, /setup lists only owner's restaurants

create table if not exists public.telegram_users (
  id uuid primary key default uuid_generate_v4(),
  telegram_user_id bigint not null unique,
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_link_codes (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used_at timestamptz,
  used_by_telegram_user_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_telegram_link_codes_owner on public.telegram_link_codes (owner_id, created_at desc);
create index if not exists idx_telegram_link_codes_active on public.telegram_link_codes (code, expires_at) where used_at is null;

alter table if exists public.groups
  add column if not exists linked_by_owner_id uuid references auth.users (id) on delete set null;

create index if not exists idx_groups_owner on public.groups (linked_by_owner_id);
