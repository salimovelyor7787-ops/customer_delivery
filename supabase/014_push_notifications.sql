-- Push notifications feed for mobile "bell" screen.

create table if not exists public.push_notifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_notifications_active_created
  on public.push_notifications (is_active, created_at desc);

alter table if exists public.push_notifications enable row level security;

drop policy if exists "push_notifications_read_by_roles" on public.push_notifications;
create policy "push_notifications_read_by_roles" on public.push_notifications
for select using (public.current_role() in ('admin', 'restaurant', 'courier', 'customer'));

drop policy if exists "push_notifications_admin_manage" on public.push_notifications;
create policy "push_notifications_admin_manage" on public.push_notifications
for all using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
