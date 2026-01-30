-- Миграция: Добавление колонки phone_placeholder
-- Добавляет текстовое поле для хранения placeholder телефона

ALTER TABLE forms ADD COLUMN IF NOT EXISTS phone_placeholder text;

COMMENT ON COLUMN forms.phone_placeholder IS 'Placeholder для поля телефона в форме контактов';
