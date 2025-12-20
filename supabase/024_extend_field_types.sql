-- =============================================================================
-- Миграция: Расширение типов динамических полей формы
-- Описание: Добавляет новые типы полей: h1, h2, h3, disclaimer, submit_button
-- Дата: 19.12.2024
-- =============================================================================

-- Удаляем старый CHECK constraint
ALTER TABLE public.form_fields 
DROP CONSTRAINT IF EXISTS form_fields_field_type_check;

-- Добавляем новый CHECK constraint с расширенным списком типов
ALTER TABLE public.form_fields 
ADD CONSTRAINT form_fields_field_type_check 
CHECK (field_type IN ('text', 'url', 'select', 'multiselect', 'checkbox', 'image', 'h1', 'h2', 'h3', 'disclaimer', 'submit_button'));

-- Обновляем комментарий к колонке
COMMENT ON COLUMN public.form_fields.field_type IS 'Тип поля: text, url, select, multiselect, checkbox, image, h1, h2, h3, disclaimer, submit_button';




