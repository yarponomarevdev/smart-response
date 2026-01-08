-- =============================================================================
-- Миграция: Добавление квот хранилища и тестирования
-- Описание: Добавляет поля для лимитов хранилища (50 МБ) и ежедневного тестирования (50 раз)
-- Также изменяет дефолтный лимит форм для новых пользователей с 10 на 2
-- Дата: 2026-01-07
-- =============================================================================

-- 1. Добавляем новые поля квот в таблицу users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS max_storage INTEGER DEFAULT 52428800,
ADD COLUMN IF NOT EXISTS max_daily_tests INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS daily_tests_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_tests_reset_date DATE DEFAULT CURRENT_DATE;

-- 2. Комментарии к полям
COMMENT ON COLUMN public.users.max_storage IS 'Максимальный размер хранилища в байтах. NULL = неограниченно. По умолчанию 50 МБ (52428800 байт)';
COMMENT ON COLUMN public.users.max_daily_tests IS 'Максимальное количество тестирований форм в день. NULL = неограниченно. По умолчанию 50';
COMMENT ON COLUMN public.users.daily_tests_count IS 'Счетчик тестирований за текущий день';
COMMENT ON COLUMN public.users.daily_tests_reset_date IS 'Дата последнего сброса счетчика тестирований';

-- 3. Устанавливаем дефолтные значения для существующих пользователей
-- Суперадмины - неограниченно (NULL)
UPDATE public.users 
SET max_storage = NULL, max_daily_tests = NULL, daily_tests_count = 0, daily_tests_reset_date = CURRENT_DATE
WHERE role = 'superadmin';

-- Обычные пользователи - стандартные лимиты
UPDATE public.users 
SET max_storage = 52428800, max_daily_tests = 50, daily_tests_count = 0, daily_tests_reset_date = CURRENT_DATE
WHERE role = 'user' AND max_storage IS NULL;

-- 4. Обновляем функцию handle_new_user для установки всех квот (включая max_forms = 2)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, email, role, 
    max_forms, max_leads, can_publish_forms,
    max_storage, max_daily_tests, daily_tests_count, daily_tests_reset_date
  )
  VALUES (
    new.id,
    new.email,
    CASE 
      WHEN new.email = 'hello@vasilkov.digital' THEN 'superadmin'
      ELSE 'user' 
    END,
    -- max_forms
    CASE 
      WHEN new.email = 'hello@vasilkov.digital' THEN NULL  -- superadmin - unlimited
      ELSE 2  -- regular users - 2 forms
    END,
    -- max_leads
    CASE 
      WHEN new.email = 'hello@vasilkov.digital' THEN NULL  -- superadmin - unlimited
      ELSE 20  -- regular users - 20 leads
    END,
    true,  -- can publish by default
    -- max_storage
    CASE 
      WHEN new.email = 'hello@vasilkov.digital' THEN NULL  -- superadmin - unlimited
      ELSE 52428800  -- regular users - 50 MB
    END,
    -- max_daily_tests
    CASE 
      WHEN new.email = 'hello@vasilkov.digital' THEN NULL  -- superadmin - unlimited
      ELSE 50  -- regular users - 50 tests per day
    END,
    0,  -- daily_tests_count starts at 0
    CURRENT_DATE  -- daily_tests_reset_date
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Создаем функцию для инкремента счетчика тестирований с автоматическим сбросом
CREATE OR REPLACE FUNCTION public.increment_daily_test_count(user_id UUID)
RETURNS TABLE(can_test BOOLEAN, current_count INTEGER, max_limit INTEGER) AS $$
DECLARE
  v_reset_date DATE;
  v_current_count INTEGER;
  v_max_tests INTEGER;
BEGIN
  -- Получаем текущие значения пользователя
  SELECT daily_tests_reset_date, daily_tests_count, max_daily_tests
  INTO v_reset_date, v_current_count, v_max_tests
  FROM public.users
  WHERE id = user_id;

  -- Если пользователь не найден
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0;
    RETURN;
  END IF;

  -- Если лимит NULL (неограниченно), всегда разрешаем
  IF v_max_tests IS NULL THEN
    -- Все равно обновляем счетчик для статистики
    IF v_reset_date < CURRENT_DATE THEN
      UPDATE public.users 
      SET daily_tests_count = 1, daily_tests_reset_date = CURRENT_DATE
      WHERE id = user_id;
      RETURN QUERY SELECT TRUE, 1, NULL::INTEGER;
    ELSE
      UPDATE public.users 
      SET daily_tests_count = v_current_count + 1
      WHERE id = user_id;
      RETURN QUERY SELECT TRUE, v_current_count + 1, NULL::INTEGER;
    END IF;
    RETURN;
  END IF;

  -- Проверяем, нужно ли сбросить счетчик (новый день)
  IF v_reset_date < CURRENT_DATE THEN
    -- Сбрасываем счетчик и устанавливаем новую дату
    UPDATE public.users 
    SET daily_tests_count = 1, daily_tests_reset_date = CURRENT_DATE
    WHERE id = user_id;
    
    RETURN QUERY SELECT TRUE, 1, v_max_tests;
    RETURN;
  END IF;

  -- Проверяем лимит
  IF v_current_count >= v_max_tests THEN
    RETURN QUERY SELECT FALSE, v_current_count, v_max_tests;
    RETURN;
  END IF;

  -- Инкрементируем счетчик
  UPDATE public.users 
  SET daily_tests_count = v_current_count + 1
  WHERE id = user_id;

  RETURN QUERY SELECT TRUE, v_current_count + 1, v_max_tests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_daily_test_count(UUID) IS 'Увеличивает счетчик ежедневных тестирований. Автоматически сбрасывает счетчик при наступлении нового дня. Возвращает can_test (можно ли тестировать), current_count (текущий счетчик) и max_limit (лимит).';

-- 6. Создаем функцию для получения информации о тестировании (без инкремента)
CREATE OR REPLACE FUNCTION public.get_daily_test_info(user_id UUID)
RETURNS TABLE(current_count INTEGER, max_limit INTEGER, reset_date DATE) AS $$
DECLARE
  v_reset_date DATE;
  v_current_count INTEGER;
  v_max_tests INTEGER;
BEGIN
  -- Получаем текущие значения пользователя
  SELECT daily_tests_reset_date, daily_tests_count, max_daily_tests
  INTO v_reset_date, v_current_count, v_max_tests
  FROM public.users
  WHERE id = user_id;

  -- Если пользователь не найден
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, CURRENT_DATE;
    RETURN;
  END IF;

  -- Если дата устарела, возвращаем 0 (счетчик будет сброшен при следующем тесте)
  IF v_reset_date < CURRENT_DATE THEN
    RETURN QUERY SELECT 0, v_max_tests, CURRENT_DATE;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_current_count, v_max_tests, v_reset_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_daily_test_info(UUID) IS 'Возвращает информацию о тестированиях пользователя за текущий день без изменения счетчика.';
