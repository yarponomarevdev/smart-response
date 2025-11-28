-- Исправляем политику forms_superadmin_read - используем правильный синтаксис
-- Также создаем функцию is_superadmin для проверки роли без рекурсии

-- Создаем функцию для проверки superadmin
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

-- Удаляем старую политику с неправильным синтаксисом
DROP POLICY IF EXISTS "forms_superadmin_read" ON public.forms;

-- Создаем новую политику с использованием функции
CREATE POLICY "forms_superadmin_read"
  ON public.forms FOR SELECT
  TO authenticated
  USING (public.is_superadmin());

