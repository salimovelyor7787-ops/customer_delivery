-- Postgres outbox queue for async side effects after order creation.

create table if not exists public.order_events_outbox (
  id bigserial primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  event_type text not null check (event_type in ('notification', 'analytics', 'promo_log')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts int not null default 0,
  error_message text,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_order_events_outbox_pending
  on public.order_events_outbox (status, available_at, created_at)
  where status in ('pending', 'failed');

create index if not exists idx_order_events_outbox_order_id
  on public.order_events_outbox (order_id, created_at desc);

create or replace function public.claim_order_outbox_batch(p_limit int default 100)
returns table (
  id bigint,
  order_id uuid,
  event_type text,
  payload jsonb,
  attempts int,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select q.id
    from public.order_events_outbox q
    where q.status in ('pending', 'failed')
      and q.available_at <= now()
    order by q.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  ),
  upd as (
    update public.order_events_outbox q
    set status = 'processing',
        attempts = q.attempts + 1,
        error_message = null
    where q.id in (select p.id from picked p)
    returning q.id, q.order_id, q.event_type, q.payload, q.attempts, q.created_at
  )
  select u.id, u.order_id, u.event_type, u.payload, u.attempts, u.created_at
  from upd u;
end;
$$;

create or replace function public.complete_order_outbox_event(p_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.order_events_outbox
  set status = 'done',
      processed_at = now(),
      error_message = null
  where id = p_id;
$$;

create or replace function public.fail_order_outbox_event(
  p_id bigint,
  p_error text,
  p_retry_after_seconds int default 30
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.order_events_outbox
  set status = 'failed',
      error_message = left(coalesce(p_error, 'unknown error'), 600),
      available_at = now() + make_interval(secs => greatest(5, least(coalesce(p_retry_after_seconds, 30), 3600)))
  where id = p_id;
$$;

grant execute on function public.claim_order_outbox_batch(int) to service_role;
grant execute on function public.complete_order_outbox_event(bigint) to service_role;
grant execute on function public.fail_order_outbox_event(bigint, text, int) to service_role;
