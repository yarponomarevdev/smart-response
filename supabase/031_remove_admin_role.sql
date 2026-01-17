-- Миграция: Удаление роли 'admin' из системы
-- Дата: 2025-01-06
-- Описание: Удаляем роль 'admin', оставляем только 'superadmin' и 'user'
-- Безопасность: Проверено - в БД нет пользователей с ролью 'admin' (0 записей)
-- Функция is_superadmin() используется в RLS политиках форм, но изменение безопасно

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

-- 4. Обновляем функцию is_superadmin - убираем проверку на 'admin'
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
