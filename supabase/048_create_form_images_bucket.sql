-- =============================================================================
-- Миграция: Создание публичного бакета для изображений форм
-- Описание: Создаёт bucket 'form-images' для хранения картинок опций и других публичных ассетов
-- =============================================================================

-- Создаем публичный бакет
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-images',
  'form-images',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Политика: Публичное чтение для всех
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'form-images' );

-- Политика: Владелец формы может загружать файлы
-- Путь файла должен начинаться с form_id: {form_id}/{filename}
CREATE POLICY "Form Owner Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'form-images'
  AND (
    -- Разрешаем authenticated пользователям загружать, если они владельцы формы
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = (split_part(name, '/', 1))::uuid
      AND forms.owner_id = auth.uid()
    )
  )
);

-- Политика: Владелец формы может удалять файлы
CREATE POLICY "Form Owner Delete Access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'form-images'
  AND (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = (split_part(name, '/', 1))::uuid
      AND forms.owner_id = auth.uid()
    )
  )
);

-- Политика: Владелец формы может обновлять файлы (на всякий случай)
CREATE POLICY "Form Owner Update Access"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'form-images'
  AND (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = (split_part(name, '/', 1))::uuid
      AND forms.owner_id = auth.uid()
    )
  )
);
