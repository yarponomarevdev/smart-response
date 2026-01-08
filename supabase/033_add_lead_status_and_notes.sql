-- =============================================================================
-- Миграция: Добавление менеджерского статуса и заметок для лидов
-- Описание: Добавляет поле lead_status для отслеживания обработки лида
--           и поле notes для заметок
-- Дата: 08.01.2026
-- =============================================================================

-- Добавляем поле lead_status для менеджерского статуса лида
-- Возможные значения: todo, in_progress, done
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_status VARCHAR(20) DEFAULT 'todo' 
CHECK (lead_status IN ('todo', 'in_progress', 'done'));

-- Добавляем поле notes для заметок
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Комментарии к колонкам
COMMENT ON COLUMN public.leads.lead_status IS 'Менеджерский статус обработки лида: todo, in_progress, done';
COMMENT ON COLUMN public.leads.notes IS 'Заметки к лиду';

-- Индекс для фильтрации по статусу
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON public.leads(lead_status);
