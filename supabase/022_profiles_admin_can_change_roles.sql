-- Allow platform admins to change user roles from web_admin (still blocks normal users).
-- Uses SECURITY DEFINER so the admin check does not recurse through RLS on profiles.

create or replace function public.profiles_prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    if auth.uid() is null then
      return new;
    end if;

    if exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    ) then
      return new;
    end if;

    raise exception 'Changing role is not allowed from the client';
  end if;

  return new;
end;
$$;
