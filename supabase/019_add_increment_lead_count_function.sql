-- =============================================================================
-- Миграция: Добавление функции для увеличения счетчика лидов
-- Описание: Функция для атомарного увеличения счетчика lead_count в таблице forms
-- Дата: 08.12.2024
-- =============================================================================

-- Создаём функцию для увеличения счетчика лидов
CREATE OR REPLACE FUNCTION public.increment_lead_count(form_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.forms
  SET lead_count = COALESCE(lead_count, 0) + 1
  WHERE id = form_id;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION public.increment_lead_count(UUID) IS 'Увеличивает счетчик лидов формы на 1';

