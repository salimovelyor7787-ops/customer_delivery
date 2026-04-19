-- Rich promocodes (restaurant-owned, expiry, audience, min subtotal, % or fixed discount)
-- and applying them at checkout (orders.promo_* columns).

-- ---------------------------------------------------------------------------
-- promocodes: relax strict NOT NULL on discount so fixed-amount promos can omit it
-- ---------------------------------------------------------------------------
alter table public.promocodes drop constraint if exists promocodes_discount_check;

alter table public.promocodes alter column discount drop not null;

alter table public.promocodes
  add column if not exists restaurant_id uuid references public.restaurants (id) on delete cascade,
  add column if not exists expires_at timestamptz,
  add column if not exists audience text not null default 'all',
  add column if not exists min_subtotal_cents int not null default 0,
  add column if not exists discount_fixed_cents int,
  add column if not exists listed_for_customers boolean not null default true;

alter table public.promocodes drop constraint if exists promocodes_audience_check;
alter table public.promocodes add constraint promocodes_audience_check check (audience in ('all', 'first_order'));

alter table public.promocodes drop constraint if exists promocodes_min_subtotal_nonneg;
alter table public.promocodes add constraint promocodes_min_subtotal_nonneg check (min_subtotal_cents >= 0);

alter table public.promocodes drop constraint if exists promocodes_discount_rules;
alter table public.promocodes add constraint promocodes_discount_rules check (
  (
    discount_fixed_cents is null
    and discount is not null
    and discount >= 1
    and discount <= 100
  )
  or (
    discount_fixed_cents is not null
    and discount_fixed_cents > 0
    and discount_fixed_cents <= 50000000
  )
);

create index if not exists idx_promocodes_restaurant on public.promocodes (restaurant_id);

-- ---------------------------------------------------------------------------
-- orders: store applied promo (server-authoritative amounts)
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists promo_code text;
alter table public.orders add column if not exists promocode_id uuid references public.promocodes (id) on delete set null;
alter table public.orders add column if not exists promo_discount_cents int not null default 0;

-- ---------------------------------------------------------------------------
-- RLS: replace broad promocode read; add restaurant self-service
-- ---------------------------------------------------------------------------
drop policy if exists "promocodes_read_by_roles" on public.promocodes;

-- Customers / couriers: only public, active, non-expired listing promos
create policy "promocodes_public_list_read" on public.promocodes
for select using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('customer', 'courier')
  )
  and active = true
  and (expires_at is null or expires_at > now())
  and listed_for_customers = true
);

-- Restaurant owners: manage and read all promos tied to their restaurant (incl. unlisted)
drop policy if exists "promocodes_restaurant_manage" on public.promocodes;
create policy "promocodes_restaurant_manage" on public.promocodes
for all using (
  public.current_role() = 'restaurant'
  and restaurant_id is not null
  and exists (
    select 1
    from public.restaurants r
    where r.id = promocodes.restaurant_id and r.owner_id = auth.uid()
  )
)
with check (
  public.current_role() = 'restaurant'
  and restaurant_id is not null
  and exists (
    select 1
    from public.restaurants r
    where r.id = promocodes.restaurant_id and r.owner_id = auth.uid()
  )
);
