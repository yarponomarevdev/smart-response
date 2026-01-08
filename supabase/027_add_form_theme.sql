-- =============================================================================
-- Миграция: Добавление настройки темы для формы
-- Описание: Добавляет поле theme в таблицу forms для управления темой отображения формы
--           Возможные значения: 'light', 'dark'
-- =============================================================================

-- Создаём тип для темы
DO $$ BEGIN
  CREATE TYPE form_theme AS ENUM ('light', 'dark');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Добавляем колонку theme с дефолтным значением 'light'
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS theme form_theme DEFAULT 'light';

-- Комментарий к колонке
COMMENT ON COLUMN public.forms.theme IS 'Тема отображения формы: light или dark';

