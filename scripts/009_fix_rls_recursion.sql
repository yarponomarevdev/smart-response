-- Исправляем рекурсивные RLS политики
-- Проблема: политика superadmin_read_all_users вызывает бесконечную рекурсию

-- Удаляем все существующие политики на users
DROP POLICY IF EXISTS "superadmin_read_all_users" ON public.users;
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "Users can read all user data" ON public.users;
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Superadmin can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Создаем простые политики без рекурсии
-- Пользователи могут читать свои собственные данные
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Пользователи могут вставлять свои собственные данные (для триггера)
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Пользователи могут обновлять свои собственные данные
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Исправляем политики на forms - убираем рекурсию через users
DROP POLICY IF EXISTS "users_can_view_own_forms" ON public.forms;
DROP POLICY IF EXISTS "forms_owner_read" ON public.forms;
DROP POLICY IF EXISTS "forms_public_read" ON public.forms;
DROP POLICY IF EXISTS "Users can read own forms" ON public.forms;
DROP POLICY IF EXISTS "Superadmins can read all forms" ON public.forms;

-- Простая политика: пользователи могут читать свои формы
CREATE POLICY "forms_owner_read"
  ON public.forms FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- Функция для проверки, является ли пользователь superadmin
-- Используем email из auth.users напрямую, чтобы избежать рекурсии
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'hello@vasilkov.digital'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Политика для superadmin - используем функцию для проверки
CREATE POLICY "forms_superadmin_read"
  ON public.forms FOR SELECT
  TO authenticated
  USING (public.is_superadmin());

-- Политика для анонимных пользователей - могут читать активные формы
-- Это необходимо для валидации foreign key при создании лидов
CREATE POLICY "forms_public_read_active"
  ON public.forms FOR SELECT
  TO anon
  USING (is_active = true);

-- Политики для INSERT, UPDATE, DELETE остаются без изменений
DROP POLICY IF EXISTS "users_can_create_own_form" ON public.forms;
DROP POLICY IF EXISTS "forms_owner_insert" ON public.forms;
CREATE POLICY "forms_owner_insert"
  ON public.forms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "users_can_update_own_forms" ON public.forms;
DROP POLICY IF EXISTS "forms_owner_update" ON public.forms;
CREATE POLICY "forms_owner_update"
  ON public.forms FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "users_can_delete_own_forms" ON public.forms;
DROP POLICY IF EXISTS "forms_owner_delete" ON public.forms;
CREATE POLICY "forms_owner_delete"
  ON public.forms FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

