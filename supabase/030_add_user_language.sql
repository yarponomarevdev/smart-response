-- =============================================================================
-- Миграция: Добавление поля language в таблицу users
-- Описание: Персональная языковая настройка для каждого пользователя
-- Дата: 03.01.2026
-- =============================================================================

-- Добавляем поле language в таблицу users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'ru' CHECK (language IN ('ru', 'en'));

-- Комментарий к полю
COMMENT ON COLUMN public.users.language IS 'Язык интерфейса пользователя: ru (русский) или en (английский)';

-- Устанавливаем значение по умолчанию для существующих пользователей
UPDATE public.users
SET language = 'ru'
WHERE language IS NULL;
