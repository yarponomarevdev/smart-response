-- =============================================================================
-- Миграция: Удаление типа поля submit_button
-- Описание: Удаляет тип поля submit_button из списка допустимых типов полей
-- Дата: 2024-12-XX
-- =============================================================================

-- Удаляем все существующие поля с типом submit_button
DELETE FROM public.form_fields 
WHERE field_type = 'submit_button';

-- Удаляем старый CHECK constraint
ALTER TABLE public.form_fields 
DROP CONSTRAINT IF EXISTS form_fields_field_type_check;

-- Добавляем новый CHECK constraint без submit_button
ALTER TABLE public.form_fields 
ADD CONSTRAINT form_fields_field_type_check 
CHECK (field_type IN ('text', 'url', 'select', 'multiselect', 'checkbox', 'image', 'h1', 'h2', 'h3', 'disclaimer'));

-- Обновляем комментарий к колонке
COMMENT ON COLUMN public.form_fields.field_type IS 'Тип поля: text, url, select, multiselect, checkbox, image, h1, h2, h3, disclaimer';

