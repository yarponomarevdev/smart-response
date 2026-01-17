-- =============================================================================
-- Миграция: Добавление полей квот для пользователей
-- Описание: Позволяет суперадминам управлять лимитами форм и лидов для каждого пользователя
-- Дата: 04.12.2024
-- =============================================================================

-- 1. Добавляем поля квот в таблицу users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS max_forms INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_leads INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS can_publish_forms BOOLEAN DEFAULT true;

-- 2. Комментарии к полям
COMMENT ON COLUMN public.users.max_forms IS 'Максимальное количество форм. NULL = неограниченно';
COMMENT ON COLUMN public.users.max_leads IS 'Максимальное количество лидов (суммарно по всем формам). NULL = неограниченно';
COMMENT ON COLUMN public.users.can_publish_forms IS 'Может ли пользователь публиковать формы';

-- 3. Устанавливаем дефолтные значения для существующих пользователей
-- Суперадмины - неограниченно (NULL)
UPDATE public.users 
SET max_forms = NULL, max_leads = NULL, can_publish_forms = true
WHERE role = 'superadmin';

-- Обычные пользователи - лимит 1 форма, 20 лидов
UPDATE public.users 
SET max_forms = 1, max_leads = 20, can_publish_forms = true
WHERE role = 'user' AND max_forms IS NULL;

-- 4. Обновляем функцию handle_new_user для установки дефолтных квот
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
      ELSE 1  -- regular users - 1 form
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

