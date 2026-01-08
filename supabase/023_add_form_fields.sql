-- =============================================================================
-- Миграция: Добавление динамических полей формы
-- Описание: Создаёт таблицу form_fields для хранения кастомных полей форм
-- Дата: 12.12.2024
-- =============================================================================

-- Создаём таблицу динамических полей формы
CREATE TABLE IF NOT EXISTS public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'url', 'select', 'multiselect', 'checkbox', 'image')),
  field_label VARCHAR(255) NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  options JSONB DEFAULT '[]'::jsonb,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по форме
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON public.form_fields(form_id);

-- Уникальный индекс для предотвращения дублирования ключей в рамках одной формы
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_fields_form_key ON public.form_fields(form_id, field_key);

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.form_fields IS 'Динамические поля форм';
COMMENT ON COLUMN public.form_fields.field_type IS 'Тип поля: text, url, select, multiselect, checkbox, image';
COMMENT ON COLUMN public.form_fields.field_label IS 'Отображаемое название поля';
COMMENT ON COLUMN public.form_fields.field_key IS 'Уникальный ключ поля для формы';
COMMENT ON COLUMN public.form_fields.is_required IS 'Обязательное ли поле';
COMMENT ON COLUMN public.form_fields.options IS 'Опции для select/multiselect в формате [{value, label}]';
COMMENT ON COLUMN public.form_fields.order_index IS 'Порядок отображения поля';

-- RLS политики
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;

-- Политика чтения: владелец формы или суперадмин
CREATE POLICY "form_fields_select_policy" ON public.form_fields
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_fields.form_id
      AND (
        f.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superadmin')
      )
    )
  );

-- Политика вставки: владелец формы
CREATE POLICY "form_fields_insert_policy" ON public.form_fields
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_fields.form_id
      AND f.owner_id = auth.uid()
    )
  );

-- Политика обновления: владелец формы
CREATE POLICY "form_fields_update_policy" ON public.form_fields
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_fields.form_id
      AND f.owner_id = auth.uid()
    )
  );

-- Политика удаления: владелец формы
CREATE POLICY "form_fields_delete_policy" ON public.form_fields
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_fields.form_id
      AND f.owner_id = auth.uid()
    )
  );

-- Добавляем колонку custom_fields в таблицу leads для хранения значений динамических полей
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.leads.custom_fields IS 'Значения динамических полей формы';
