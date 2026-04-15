-- Fix recursive RLS evaluation caused by current_role() calling profiles
-- while profiles policies themselves use current_role().

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.role::text
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    'customer'
  )
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;
