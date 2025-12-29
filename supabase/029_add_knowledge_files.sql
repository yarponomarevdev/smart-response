-- =============================================================================
-- Миграция: Добавление базы знаний для форм
-- Описание: Создаёт таблицу для хранения метаданных файлов базы знаний
-- Дата: 29.12.2024
-- =============================================================================

-- Создаём таблицу метаданных файлов базы знаний
CREATE TABLE IF NOT EXISTS public.form_knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по форме
CREATE INDEX IF NOT EXISTS idx_form_knowledge_files_form_id ON public.form_knowledge_files(form_id);

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.form_knowledge_files IS 'Файлы базы знаний для форм';
COMMENT ON COLUMN public.form_knowledge_files.file_name IS 'Оригинальное имя файла';
COMMENT ON COLUMN public.form_knowledge_files.file_path IS 'Путь к файлу в Supabase Storage';
COMMENT ON COLUMN public.form_knowledge_files.file_type IS 'MIME-тип файла';
COMMENT ON COLUMN public.form_knowledge_files.file_size IS 'Размер файла в байтах';

-- =============================================================================
-- RLS политики для form_knowledge_files
-- =============================================================================

-- Включаем RLS
ALTER TABLE public.form_knowledge_files ENABLE ROW LEVEL SECURITY;

-- Политика: владелец формы может читать файлы
CREATE POLICY "Владелец формы может читать файлы базы знаний"
  ON public.form_knowledge_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = form_knowledge_files.form_id
      AND forms.owner_id = auth.uid()
    )
  );

-- Политика: владелец формы может добавлять файлы
CREATE POLICY "Владелец формы может добавлять файлы базы знаний"
  ON public.form_knowledge_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = form_knowledge_files.form_id
      AND forms.owner_id = auth.uid()
    )
  );

-- Политика: владелец формы может удалять файлы
CREATE POLICY "Владелец формы может удалять файлы базы знаний"
  ON public.form_knowledge_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = form_knowledge_files.form_id
      AND forms.owner_id = auth.uid()
    )
  );

-- Политика: superadmin может читать все файлы
CREATE POLICY "Superadmin может читать все файлы базы знаний"
  ON public.form_knowledge_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- =============================================================================
-- Storage bucket для файлов базы знаний
-- =============================================================================

-- Создание bucket (если не существует)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-files', 
  'knowledge-files', 
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain', 'text/markdown', 'text/csv', 'application/json']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Владелец формы может загружать фа" ON storage.objects;
DROP POLICY IF EXISTS "Владелец формы может загружать файлы" ON storage.objects;
DROP POLICY IF EXISTS "Владелец формы может читать файлы" ON storage.objects;
DROP POLICY IF EXISTS "Владелец формы может удалять файл" ON storage.objects;
DROP POLICY IF EXISTS "Владелец формы может удалять файлы" ON storage.objects;
DROP POLICY IF EXISTS "Service role может читать все файлы" ON storage.objects;

-- Политика: владелец формы может загружать файлы
-- name имеет формат: {form_id}/{filename}
CREATE POLICY "Владелец формы может загружать файлы"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-files'
  AND EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = (split_part(name, '/', 1))::uuid
    AND forms.owner_id = auth.uid()
  )
);

-- Политика: владелец формы может читать свои файлы
CREATE POLICY "Владелец формы может читать файлы"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-files'
  AND EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = (split_part(name, '/', 1))::uuid
    AND forms.owner_id = auth.uid()
  )
);

-- Политика: владелец формы может удалять свои файлы
CREATE POLICY "Владелец формы может удалять файлы"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-files'
  AND EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = (split_part(name, '/', 1))::uuid
    AND forms.owner_id = auth.uid()
  )
);

-- Политика: сервисный ключ может читать все файлы (для генерации)
CREATE POLICY "Service role может читать все файлы"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-files'
  AND auth.role() = 'service_role'
);
