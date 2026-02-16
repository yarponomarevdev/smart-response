-- Добавляем поле selection_type для настройки типа выбора в полях select/multiselect
-- 'single' - одиночный выбор (как select)
-- 'multiple' - множественный выбор (как multiselect)

ALTER TABLE form_fields
ADD COLUMN selection_type TEXT DEFAULT 'single' CHECK (selection_type IN ('single', 'multiple'));

-- Обновляем существующие поля: multiselect -> selection_type = 'multiple'
UPDATE form_fields
SET selection_type = 'multiple'
WHERE field_type = 'multiselect';

-- Комментарий для документации
COMMENT ON COLUMN form_fields.selection_type IS 'Тип выбора для полей select/multiselect: single (одиночный) или multiple (множественный)';
