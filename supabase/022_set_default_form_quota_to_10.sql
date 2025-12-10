-- =============================================================================
-- Миграция: Установка дефолтного лимита форм для пользователей в 10 штук
-- Описание: Изменяет дефолтное количество форм с 1 на 10 для обычных пользователей
-- Дата: 2024-12-XX
-- =============================================================================

-- 1. Обновляем существующих пользователей с лимитом 1 форма на 10 форм
UPDATE public.users 
SET max_forms = 10
WHERE role = 'user' AND max_forms = 1;

-- 2. Обновляем функцию handle_new_user для установки дефолтных квот (10 форм вместо 1)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, max_forms, max_leads, can_publish_forms)
  VALUES (
    new.id,
    new.email,
    CASE 
      WHEN new.email = 'hello@vasilkov.digital' THEN 'superadmin'
      ELSE 'user' 
    END,
    CASE 
      WHEN new.email = 'hello@vasilkov.digital' THEN NULL  -- superadmin - unlimited
      ELSE 10  -- regular users - 10 forms
    END,
    CASE 
      WHEN new.email = 'hello@vasilkov.digital' THEN NULL  -- superadmin - unlimited
      ELSE 20  -- regular users - 20 leads
    END,
    true  -- can publish by default
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

