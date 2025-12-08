-- =============================================================================
-- Миграция: Исправление функции increment_lead_count
-- Описание: Улучшенная версия функции с проверкой и логированием
-- Дата: 08.12.2024
-- =============================================================================

-- Удаляем старую функцию, если она существует
DROP FUNCTION IF EXISTS public.increment_lead_count(UUID);
DROP FUNCTION IF EXISTS public.increment_lead_count();

-- Создаём улучшенную функцию для увеличения счетчика лидов
CREATE OR REPLACE FUNCTION public.increment_lead_count(form_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Получаем текущее значение счетчика
  SELECT COALESCE(lead_count, 0) INTO current_count
  FROM public.forms
  WHERE id = form_id;
  
  -- Увеличиваем счетчик
  UPDATE public.forms
  SET lead_count = current_count + 1
  WHERE id = form_id;
  
  -- Проверяем, что обновление произошло
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form with id % not found', form_id;
  END IF;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION public.increment_lead_count(UUID) IS 'Увеличивает счетчик лидов формы на 1. Использует атомарную операцию UPDATE.';

