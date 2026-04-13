-- Пример: выдать сотруднику роль для входа в web_admin (выполнять в SQL Editor под postgres / service role).
-- Замените email на реальный.

-- update public.profiles
-- set role = 'admin'          -- или 'restaurant' | 'courier'
-- where id = (select id from auth.users where email = 'user@example.com');
