-- =============================================================================
-- Миграция: Дефолтная модель генерации изображений
-- Описание: Устанавливает dall-e-3 как значение по умолчанию для image_model
-- Дата: 17.01.2026
-- =============================================================================

-- Создаем ключ при отсутствии, либо задаем дефолт, если значение пустое
INSERT INTO public.system_settings (key, value)
VALUES ('image_model', 'dall-e-3')
ON CONFLICT (key) DO UPDATE
SET value = CASE
  WHEN public.system_settings.value IS NULL OR public.system_settings.value = '' THEN EXCLUDED.value
  ELSE public.system_settings.value
END;
