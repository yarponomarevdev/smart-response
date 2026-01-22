-- Миграция: Исправление search_path для функций
-- Устанавливаем search_path = public для предотвращения path injection атак

ALTER FUNCTION public.is_superadmin() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.increment_lead_count(form_id uuid) SET search_path = public;
ALTER FUNCTION public.increment_daily_test_count(user_id uuid) SET search_path = public;
ALTER FUNCTION public.get_daily_test_info(user_id uuid) SET search_path = public;
ALTER FUNCTION public.update_system_settings_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_admin_form() SET search_path = public;
