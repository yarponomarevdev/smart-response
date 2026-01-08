-- =============================================================================
-- Миграция: Добавление настройки отправки email респондентам
-- Описание: Добавляет поле send_email_to_respondent в таблицу forms для управления
--           отправкой email уведомлений респондентам (людям, заполнившим форму)
-- =============================================================================

-- Добавляем колонку send_email_to_respondent с дефолтным значением true
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS send_email_to_respondent BOOLEAN DEFAULT true;

-- Комментарий к колонке
COMMENT ON COLUMN public.forms.send_email_to_respondent IS 'Отправлять email с результатом респонденту (заполнившему форму)';

