-- =============================================================================
-- Миграция: Создание bucket для хранения сгенерированных изображений
-- Описание: Создаёт публичный bucket для постоянного хранения изображений,
--           сгенерированных через OpenAI DALL-E
-- Дата: 08.01.2026
-- =============================================================================

-- Создаём bucket для сгенерированных изображений
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,  -- Публичный доступ для чтения
  10485760,  -- 10MB лимит на файл
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Политика: Любой может читать изображения
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images');

-- Политика: Только сервисный ключ может загружать изображения
CREATE POLICY "Service role can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-images'
  AND auth.role() = 'service_role'
);

-- Политика: Только сервисный ключ может удалять изображения
CREATE POLICY "Service role can delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-images'
  AND auth.role() = 'service_role'
);

-- Комментарии
COMMENT ON TABLE storage.buckets IS 'Бакеты для хранения файлов';
