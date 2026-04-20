-- Admin-only RPC: list profiles with email from auth.users (not exposed on public.profiles).

create or replace function public.admin_profiles_with_email()
returns table (
  id uuid,
  full_name text,
  phone text,
  role text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) then
    raise exception 'Forbidden';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.phone,
    p.role::text,
    u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.full_name nulls last, u.email;
end;
$$;

revoke all on function public.admin_profiles_with_email() from public;
grant execute on function public.admin_profiles_with_email() to authenticated;
