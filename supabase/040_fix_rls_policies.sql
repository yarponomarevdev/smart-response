-- Миграция: Исправление RLS политик
-- 1. Заменяем auth.uid() на (select auth.uid()) для оптимизации (предотвращает пересчет на каждой строке)
-- 2. Объединяем дублирующиеся permissive политики

-- =============================================
-- ТАБЛИЦА: users
-- =============================================

DROP POLICY IF EXISTS users_read_own ON users;
CREATE POLICY users_read_own ON users
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- =============================================
-- ТАБЛИЦА: forms
-- =============================================

-- Удаляем дублирующиеся политики SELECT
DROP POLICY IF EXISTS forms_anon_read_active ON forms;
DROP POLICY IF EXISTS forms_public_select_policy ON forms;
DROP POLICY IF EXISTS forms_owner_read ON forms;
DROP POLICY IF EXISTS forms_superadmin_read ON forms;

-- Создаём единую политику для анонимного чтения активных форм
CREATE POLICY forms_public_read ON forms
  FOR SELECT TO anon
  USING (is_active = true);

-- Создаём единую политику для аутентифицированных пользователей
CREATE POLICY forms_authenticated_read ON forms
  FOR SELECT TO authenticated
  USING (
    owner_id = (select auth.uid())
    OR is_active = true
    OR is_superadmin()
  );

DROP POLICY IF EXISTS forms_owner_insert ON forms;
CREATE POLICY forms_owner_insert ON forms
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS forms_owner_update ON forms;
CREATE POLICY forms_owner_update ON forms
  FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_superadmin())
  WITH CHECK (owner_id = (select auth.uid()) OR is_superadmin());

DROP POLICY IF EXISTS forms_owner_delete ON forms;
CREATE POLICY forms_owner_delete ON forms
  FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_superadmin());

-- =============================================
-- ТАБЛИЦА: leads
-- =============================================

-- Удаляем дублирующиеся политики INSERT
DROP POLICY IF EXISTS leads_anyone_insert ON leads;
DROP POLICY IF EXISTS leads_public_insert_policy ON leads;

-- Создаём единую политику INSERT (только для активных форм)
CREATE POLICY leads_insert ON leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = leads.form_id AND f.is_active = true
    )
  );

-- Удаляем дублирующиеся политики SELECT
DROP POLICY IF EXISTS leads_owner_read ON leads;
DROP POLICY IF EXISTS leads_read_all_for_superadmin ON leads;

-- Создаём единую политику SELECT
CREATE POLICY leads_read ON leads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = leads.form_id AND forms.owner_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid()) AND users.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS leads_owner_update ON leads;
CREATE POLICY leads_update ON leads
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = leads.form_id AND forms.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS leads_delete_for_superadmin ON leads;
CREATE POLICY leads_delete ON leads
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid()) AND users.role = 'superadmin'
    )
  );

-- =============================================
-- ТАБЛИЦА: form_fields
-- =============================================

-- Удаляем дублирующиеся политики SELECT
DROP POLICY IF EXISTS form_fields_select_policy ON form_fields;
DROP POLICY IF EXISTS form_fields_public_select_policy ON form_fields;

-- Единая политика SELECT: владелец, superadmin, или публичный доступ к активным формам
CREATE POLICY form_fields_read ON form_fields
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_fields.form_id
      AND (
        f.is_active = true
        OR f.owner_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = (select auth.uid()) AND u.role = 'superadmin'
        )
      )
    )
  );

DROP POLICY IF EXISTS form_fields_insert_policy ON form_fields;
CREATE POLICY form_fields_insert ON form_fields
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_fields.form_id AND f.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS form_fields_update_policy ON form_fields;
CREATE POLICY form_fields_update ON form_fields
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_fields.form_id AND f.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS form_fields_delete_policy ON form_fields;
CREATE POLICY form_fields_delete ON form_fields
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms f
      WHERE f.id = form_fields.form_id AND f.owner_id = (select auth.uid())
    )
  );

-- =============================================
-- ТАБЛИЦА: form_knowledge_files
-- =============================================

-- Удаляем дублирующиеся политики SELECT
DROP POLICY IF EXISTS "Superadmin может читать все файлы базы " ON form_knowledge_files;
DROP POLICY IF EXISTS "Владелец формы может читать файлы " ON form_knowledge_files;

-- Единая политика SELECT
CREATE POLICY form_knowledge_files_read ON form_knowledge_files
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_knowledge_files.form_id AND forms.owner_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid()) AND users.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Владелец формы может добавлять фа" ON form_knowledge_files;
CREATE POLICY form_knowledge_files_insert ON form_knowledge_files
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_knowledge_files.form_id AND forms.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Владелец формы может удалять файл" ON form_knowledge_files;
CREATE POLICY form_knowledge_files_delete ON form_knowledge_files
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_knowledge_files.form_id AND forms.owner_id = (select auth.uid())
    )
  );

-- =============================================
-- ТАБЛИЦА: system_settings
-- =============================================

DROP POLICY IF EXISTS system_settings_read_for_superadmin ON system_settings;
DROP POLICY IF EXISTS system_settings_read_for_service ON system_settings;

-- Единая политика SELECT: superadmin или anon (для сервисных запросов)
CREATE POLICY system_settings_read ON system_settings
  FOR SELECT TO anon, authenticated
  USING (
    -- anon может читать всё (для API)
    (select auth.uid()) IS NULL
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid()) AND users.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS system_settings_update_for_superadmin ON system_settings;
CREATE POLICY system_settings_update ON system_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid()) AND users.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid()) AND users.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS system_settings_insert_for_superadmin ON system_settings;
CREATE POLICY system_settings_insert ON system_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid()) AND users.role = 'superadmin'
    )
  );
