-- =============================================================================
-- Миграция: Добавление таблицы системных настроек
-- Описание: Таблица для глобальных настроек, доступных только суперадминам
-- Дата: 04.12.2024
-- =============================================================================

-- Создаём таблицу системных настроек
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Включаем RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Удаляем политики, если они уже существуют
DROP POLICY IF EXISTS "system_settings_read_for_superadmin" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_update_for_superadmin" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_insert_for_superadmin" ON public.system_settings;

-- Политика чтения: только суперадмины
CREATE POLICY "system_settings_read_for_superadmin"
ON public.system_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Политика обновления: только суперадмины
CREATE POLICY "system_settings_update_for_superadmin"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Политика вставки: только суперадмины
CREATE POLICY "system_settings_insert_for_superadmin"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Политика чтения для сервиса (API route)
DROP POLICY IF EXISTS "system_settings_read_for_service" ON public.system_settings;
CREATE POLICY "system_settings_read_for_service"
ON public.system_settings
FOR SELECT
TO anon
USING (true);

-- Вставляем начальное значение глобального системного промпта
INSERT INTO public.system_settings (key, value)
VALUES (
  'global_system_prompt',
  'You are an expert business consultant. Provide clear, actionable recommendations in Russian language.

FORMATTING GUIDELINES:
- Use markdown formatting for better readability
- Use **bold** for emphasis on important points
- Use ## for section headings (h2)
- Use ### for subsections (h3)
- Use - or * for bullet lists
- Use numbered lists (1. 2. 3.) for ordered recommendations
- Keep paragraphs separated by blank lines
- Use clear, professional language'
)
ON CONFLICT (key) DO NOTHING;

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trigger_update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

