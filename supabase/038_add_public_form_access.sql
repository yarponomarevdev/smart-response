-- =============================================================================
-- Миграция: Добавление публичного доступа к формам
-- Описание: Позволяет неавторизованным пользователям просматривать активные формы
--           и заполнять их (создавать лиды)
-- Дата: 17.01.2026
-- =============================================================================

-- Публичное чтение активных форм
CREATE POLICY "forms_public_select_policy" ON public.forms
  FOR SELECT
  USING (is_active = true);

-- Публичное чтение полей активных форм
CREATE POLICY "form_fields_public_select_policy" ON public.form_fields
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_fields.form_id
      AND f.is_active = true
    )
  );

-- Публичное чтение контента активных форм
-- Сначала проверяем, существует ли таблица form_content
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form_content') THEN
    -- Включаем RLS если еще не включена
    EXECUTE 'ALTER TABLE public.form_content ENABLE ROW LEVEL SECURITY';
    
    -- Добавляем политику публичного чтения
    EXECUTE '
      CREATE POLICY "form_content_public_select_policy" ON public.form_content
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.forms f
            WHERE f.id = form_content.form_id
            AND f.is_active = true
          )
        )
    ';
  END IF;
END $$;

-- Публичное создание лидов (для заполнения форм)
CREATE POLICY "leads_public_insert_policy" ON public.leads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = leads.form_id
      AND f.is_active = true
    )
  );

-- Комментарии
COMMENT ON POLICY "forms_public_select_policy" ON public.forms IS 
  'Позволяет всем пользователям (включая неавторизованных) читать активные формы';

COMMENT ON POLICY "form_fields_public_select_policy" ON public.form_fields IS 
  'Позволяет всем пользователям читать поля активных форм';

COMMENT ON POLICY "leads_public_insert_policy" ON public.leads IS 
  'Позволяет всем пользователям создавать лиды для активных форм';
