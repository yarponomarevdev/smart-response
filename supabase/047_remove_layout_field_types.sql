-- =============================================================================
-- Миграция: Удаление типов полей оформления из form_fields
-- Описание: Удаляет поля типа h1, h2, h3, disclaimer из динамических полей,
--           так как они теперь статичные в таблице forms
-- Дата: 03.02.2026
-- =============================================================================

-- Удаляем существующие записи с типами полей оформления
DELETE FROM public.form_fields 
WHERE field_type IN ('h1', 'h2', 'h3', 'disclaimer');

-- Удаляем старый CHECK constraint
ALTER TABLE public.form_fields 
DROP CONSTRAINT IF EXISTS form_fields_field_type_check;

-- Добавляем новый CHECK constraint без типов оформления
ALTER TABLE public.form_fields 
ADD CONSTRAINT form_fields_field_type_check 
CHECK (field_type IN ('text', 'url', 'select', 'multiselect', 'checkbox', 'image'));

-- Обновляем комментарий к колонке
COMMENT ON COLUMN public.form_fields.field_type IS 'Тип поля: text, url, select, multiselect, checkbox, image';
