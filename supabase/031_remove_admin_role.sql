-- Миграция: Удаление роли 'admin' из системы
-- Дата: 2025-01-06
-- Описание: Удаляем роль 'admin', оставляем только 'superadmin' и 'user'

-- 1. Удаляем старый constraint
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Добавляем новый constraint без роли 'admin'
ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role = ANY (ARRAY['superadmin'::text, 'user'::text]));

-- 3. Обновляем существующие записи с ролью 'admin' на 'user' (если такие есть)
UPDATE public.users
SET role = 'user'
WHERE role = 'admin';

-- 4. Обновляем политики форм (если есть упоминания admin)
-- В политике create_own_forms_if_quota_allows уже используется проверка на superadmin
-- Никаких изменений не требуется, так как admin не имел особых прав в политиках
