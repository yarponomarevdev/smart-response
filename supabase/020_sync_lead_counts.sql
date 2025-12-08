-- =============================================================================
-- Миграция: Синхронизация счетчиков лидов с реальным количеством
-- Описание: Обновляет lead_count в таблице forms на основе реального количества лидов
-- Дата: 08.12.2024
-- =============================================================================

-- Синхронизируем счетчик лидов с реальным количеством лидов для всех форм
-- Исключаем тестовые лиды (hello@vasilkov.digital)
UPDATE public.forms
SET lead_count = (
  SELECT COUNT(*)
  FROM public.leads
  WHERE leads.form_id = forms.id
  AND LOWER(leads.email) != 'hello@vasilkov.digital'
);

-- Проверяем результат для пользователя yarponomarevdev@gmail.com
SELECT 
  f.id,
  f.name,
  f.owner_id,
  f.lead_count as counter_value,
  COUNT(l.id) as actual_leads_count,
  u.email as owner_email
FROM public.forms f
LEFT JOIN public.leads l ON l.form_id = f.id AND LOWER(l.email) != 'hello@vasilkov.digital'
LEFT JOIN public.users u ON u.id = f.owner_id
WHERE u.email = 'yarponomarevdev@gmail.com'
GROUP BY f.id, f.name, f.owner_id, f.lead_count, u.email;

