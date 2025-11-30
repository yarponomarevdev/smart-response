-- =============================================================================
-- ROLLBACK: Откат миграции 011_add_admin_role_unlimited_forms
-- Описание: Возвращает БД к состоянию до добавления роли admin
-- =============================================================================

-- 1. Возвращаем пользователя обратно в user
UPDATE public.users 
SET role = 'user' 
WHERE id = '6cb16c09-6a85-4079-9579-118168e95b06';

-- 2. Возвращаем constraint (убираем admin)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('superadmin', 'user'));

-- 3. Возвращаем функцию is_superadmin (только по email)
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

-- 4. Возвращаем политику UPDATE (только owner)
DROP POLICY IF EXISTS "forms_owner_update" ON public.forms;
CREATE POLICY "forms_owner_update"
  ON public.forms FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 5. Возвращаем политику DELETE (только owner)
DROP POLICY IF EXISTS "forms_owner_delete" ON public.forms;
CREATE POLICY "forms_owner_delete"
  ON public.forms FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- handle_new_user остаётся без изменений (логика та же)



