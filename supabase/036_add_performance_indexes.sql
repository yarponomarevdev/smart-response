-- =============================================================================
-- Миграция: Добавление индексов для оптимизации производительности
-- Описание: Ускоряет выборки по внешним ключам и часто используемым полям
-- Дата: 11.01.2026
-- =============================================================================

-- Индекс на owner_id для быстрой выборки форм пользователя
CREATE INDEX IF NOT EXISTS idx_forms_owner_id 
ON public.forms(owner_id);

-- Индекс на form_id для лидов (ускоряет подсчёт и выборку лидов по форме)
CREATE INDEX IF NOT EXISTS idx_leads_form_id 
ON public.leads(form_id);

-- Индекс на form_id для полей формы
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id 
ON public.form_fields(form_id);

-- Составной индекс для form_content (ускоряет выборку контента по форме)
CREATE INDEX IF NOT EXISTS idx_form_content_form_id 
ON public.form_content(form_id);

-- Индекс на form_id для файлов базы знаний
CREATE INDEX IF NOT EXISTS idx_form_knowledge_files_form_id 
ON public.form_knowledge_files(form_id);

-- Индекс на created_at для сортировки лидов по дате
CREATE INDEX IF NOT EXISTS idx_leads_created_at 
ON public.leads(created_at DESC);

-- Составной индекс для выборки лидов по форме с сортировкой по дате
CREATE INDEX IF NOT EXISTS idx_leads_form_id_created_at 
ON public.leads(form_id, created_at DESC);

-- Комментарии к индексам
COMMENT ON INDEX idx_forms_owner_id IS 'Ускоряет выборку форм по владельцу';
COMMENT ON INDEX idx_leads_form_id IS 'Ускоряет выборку и подсчёт лидов по форме';
COMMENT ON INDEX idx_form_fields_form_id IS 'Ускоряет выборку полей формы';
COMMENT ON INDEX idx_form_content_form_id IS 'Ускоряет выборку контента формы';
COMMENT ON INDEX idx_leads_created_at IS 'Ускоряет сортировку лидов по дате';
COMMENT ON INDEX idx_leads_form_id_created_at IS 'Ускоряет выборку лидов по форме с сортировкой';
