-- =============================================================================
-- Миграция: Добавление статичных полей оформления в таблицу forms
-- Описание: Добавляет поля для статичных элементов (заголовок, подзаголовок, текст, дисклеймер)
-- Дата: 03.02.2026
-- =============================================================================

-- Добавляем статичные поля оформления
ALTER TABLE public.forms
ADD COLUMN IF NOT EXISTS static_heading TEXT,
ADD COLUMN IF NOT EXISTS static_subheading TEXT,
ADD COLUMN IF NOT EXISTS static_body_text TEXT,
ADD COLUMN IF NOT EXISTS static_disclaimer TEXT;

-- Комментарии к полям
COMMENT ON COLUMN public.forms.static_heading IS 'Статичный заголовок формы (H1)';
COMMENT ON COLUMN public.forms.static_subheading IS 'Статичный подзаголовок формы (H2)';
COMMENT ON COLUMN public.forms.static_body_text IS 'Статичный текст формы (параграф)';
COMMENT ON COLUMN public.forms.static_disclaimer IS 'Статичный дисклеймер формы';
