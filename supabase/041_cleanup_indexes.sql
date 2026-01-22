-- Миграция: Очистка индексов
-- Удаляем дублирующиеся и неиспользуемые индексы, добавляем недостающие

-- =============================================
-- Удаление дублирующихся индексов
-- =============================================

-- idx_forms_owner дублирует idx_forms_owner_id
DROP INDEX IF EXISTS idx_forms_owner;

-- idx_leads_form дублирует idx_leads_form_id
DROP INDEX IF EXISTS idx_leads_form;

-- =============================================
-- Удаление неиспользуемых индексов
-- (по данным Supabase Advisor)
-- =============================================

DROP INDEX IF EXISTS idx_leads_created_at;
DROP INDEX IF EXISTS idx_leads_lead_status;

-- =============================================
-- Добавление недостающих индексов
-- =============================================

-- Индекс на foreign key system_settings.updated_by
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by 
  ON system_settings(updated_by);
