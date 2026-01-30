-- =============================================================================
-- Миграция: Добавление поля language в таблицу forms
-- Описание: Язык системных сообщений и ошибок формы
-- Дата: 30.01.2026
-- =============================================================================

-- Добавляем поле language в таблицу forms
ALTER TABLE public.forms
ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'ru' CHECK (language IN ('ru', 'en'));

-- Комментарий к полю
COMMENT ON COLUMN public.forms.language IS 'Язык системных сообщений формы: ru (русский) или en (английский)';

-- Устанавливаем значение по умолчанию для существующих форм
UPDATE public.forms
SET language = 'ru'
WHERE language IS NULL;
