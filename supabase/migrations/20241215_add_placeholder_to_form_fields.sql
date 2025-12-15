-- Добавление колонки placeholder для кастомных полей формы
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS placeholder text;

COMMENT ON COLUMN form_fields.placeholder IS 'Плейсхолдер для поля ввода';


