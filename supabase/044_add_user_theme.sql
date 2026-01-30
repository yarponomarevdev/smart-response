-- =============================================================================
-- Миграция: Добавление поля theme в таблицу users
-- Описание: Персональная настройка темы для каждого пользователя
-- Дата: 30.01.2026
-- =============================================================================

-- Добавляем поле theme в таблицу users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS theme VARCHAR(10) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system'));

-- Комментарий к полю
COMMENT ON COLUMN public.users.theme IS 'Тема интерфейса пользователя: light, dark или system';

-- Устанавливаем значение по умолчанию для существующих пользователей
UPDATE public.users
SET theme = 'system'
WHERE theme IS NULL;
