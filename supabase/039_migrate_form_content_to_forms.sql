-- Миграция: Перенос настроек из form_content в колонки таблицы forms
-- Это устраняет EAV антипаттерн и упрощает работу с данными

-- 1. Очистка существующих форм (каскадно удалит form_content, leads, form_fields, form_knowledge_files)
TRUNCATE forms CASCADE;

-- 2. Удаление таблицы form_content
DROP TABLE IF EXISTS form_content;

-- 3. Добавление колонок в forms
-- UI тексты
ALTER TABLE forms ADD COLUMN IF NOT EXISTS page_title text DEFAULT 'Анализ сайта с помощью ИИ';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS page_subtitle text;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS email_title text DEFAULT 'Получите результаты';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS email_subtitle text;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS email_placeholder text DEFAULT 'your@email.com';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS url_placeholder text DEFAULT 'https://example.com';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS submit_button text DEFAULT 'Получить анализ';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS email_button text DEFAULT 'Получить результат';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS share_button text DEFAULT 'Поделиться';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS download_button text DEFAULT 'Скачать';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS disclaimer text;

-- Loading messages (JSONB массив вместо отдельных колонок)
ALTER TABLE forms ADD COLUMN IF NOT EXISTS loading_messages jsonb DEFAULT '["Анализируем...", "Обрабатываем...", "Почти готово..."]'::jsonb;

-- Result
ALTER TABLE forms ADD COLUMN IF NOT EXISTS result_title text DEFAULT 'Ваш результат';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS result_blur_text text;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS result_form_text text;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS success_title text DEFAULT 'Готово!';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS success_message text DEFAULT 'Ваш результат готов';

-- AI настройки
ALTER TABLE forms ADD COLUMN IF NOT EXISTS ai_system_prompt text;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS ai_result_format text DEFAULT 'text';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS use_knowledge_base boolean DEFAULT false;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS knowledge_url text;

-- Контакты
ALTER TABLE forms ADD COLUMN IF NOT EXISTS phone_enabled boolean DEFAULT false;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS phone_required boolean DEFAULT false;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS feedback_enabled boolean DEFAULT false;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS feedback_text text;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS gradient_text text;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS privacy_url text;

-- CTA
ALTER TABLE forms ADD COLUMN IF NOT EXISTS cta_text text;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS button_text text;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS button_url text;

-- Generation step
ALTER TABLE forms ADD COLUMN IF NOT EXISTS gen_title text DEFAULT 'Генерируем ваш результат';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS gen_subtitle text DEFAULT 'Подождите несколько секунд...';

-- Комментарии к колонкам
COMMENT ON COLUMN forms.page_title IS 'Заголовок страницы формы';
COMMENT ON COLUMN forms.page_subtitle IS 'Подзаголовок страницы формы';
COMMENT ON COLUMN forms.loading_messages IS 'Массив сообщений при загрузке (JSONB)';
COMMENT ON COLUMN forms.ai_system_prompt IS 'Системный промпт для AI';
COMMENT ON COLUMN forms.ai_result_format IS 'Формат результата: text, image, image_with_text';
COMMENT ON COLUMN forms.use_knowledge_base IS 'Использовать базу знаний';
COMMENT ON COLUMN forms.phone_enabled IS 'Показывать поле телефона';
COMMENT ON COLUMN forms.phone_required IS 'Телефон обязателен';
COMMENT ON COLUMN forms.feedback_enabled IS 'Показывать чекбокс обратной связи';
