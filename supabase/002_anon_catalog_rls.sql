-- Гостевой просмотр каталога (без JWT). Выполните после 001_schema_and_rls.sql.
-- Home / рестораны / меню работают для неавторизованных клиентов.

grant usage on schema public to anon;
grant select on public.categories, public.restaurants, public.menu_items, public.menu_item_options to anon;

drop policy if exists "categories_select_anon" on public.categories;
create policy "categories_select_anon"
  on public.categories for select
  to anon
  using (true);

drop policy if exists "restaurants_select_anon" on public.restaurants;
create policy "restaurants_select_anon"
  on public.restaurants for select
  to anon
  using (true);

drop policy if exists "menu_items_select_anon" on public.menu_items;
create policy "menu_items_select_anon"
  on public.menu_items for select
  to anon
  using (true);

drop policy if exists "menu_item_options_select_anon" on public.menu_item_options;
create policy "menu_item_options_select_anon"
  on public.menu_item_options for select
  to anon
  using (true);
