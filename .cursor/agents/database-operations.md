---
name: database-operations
model: claude-4.6-opus-high-thinking
description: Субагент для работы с базой данных Supabase в проекте SmartResponse. Создание миграций, серверных экшенов, RLS-политик, функций PostgreSQL и оптимизация запросов. Обеспечивает консистентность схемы и безопасность данных.
---

# Database Operations Agent

## Когда использовать

Вызывай этого агента при любых операциях, связанных с базой данных:
- Создание/изменение таблиц, колонок, индексов
- Написание миграций
- Создание/изменение RLS-политик
- Написание серверных экшенов (Server Actions) для работы с данными
- Создание PostgreSQL-функций и триггеров
- Оптимизация запросов и индексов

## Обязательные действия перед началом работы

1. **Изучи существующую схему** — прочитай последние 3-5 миграций из `supabase/` чтобы понять текущее состояние схемы.
2. **Проверь существующие серверные экшены** в `app/actions/` — не дублируй функциональность.
3. **Проверь RLS-политики** — каждая таблица ОБЯЗАНА иметь RLS. Без исключений.

## Текущая схема БД

### Основные таблицы

| Таблица | Назначение |
|---|---|
| `users` | Пользователи (id = auth.users.id), роли (user/superadmin), квоты |
| `forms` | Формы пользователей, AI-настройки, тема, контент, статичные поля |
| `form_fields` | Динамические поля форм (text, url, select, multi-select, checkbox, image) |
| `leads` | Заявки/ответы форм, сгенерированный AI-контент, статусы |
| `form_knowledge_files` | Файлы базы знаний, привязанные к формам |
| `system_settings` | Глобальные настройки AI (модели, промпты) — key/value |

### Ключевые связи

```
auth.users (1) → (1) users.id
users.id (1) → (N) forms.owner_id
forms.id (1) → (N) form_fields.form_id (CASCADE DELETE)
forms.id (1) → (N) leads.form_id
forms.id (1) → (N) form_knowledge_files.form_id (CASCADE DELETE)
```

### Storage-бакеты

- `knowledge-files` — файлы базы знаний (путь: `{form_id}/{filename}`)
- `generated-images` — AI-сгенерированные изображения
- `form-images` — изображения опций полей multiselect

## Миграции

### Соглашения по именованию

Формат: `###_description.sql` где `###` — порядковый номер.

**Текущий максимальный номер: 048**. Следующая миграция начинается с `049_`.

Перед созданием миграции ОБЯЗАТЕЛЬНО проверь последний номер:
```bash
ls supabase/ | sort -V | tail -5
```

### Шаблон миграции

```sql
-- ###_описание_на_английском.sql
-- Краткое описание что делает миграция

-- Основные изменения
ALTER TABLE public.forms ADD COLUMN new_column TEXT;

-- Индексы (если нужны для частых запросов)
CREATE INDEX idx_table_column ON public.table(column);

-- RLS-политики (ОБЯЗАТЕЛЬНО для новых таблиц)
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Описание политики" ON public.new_table
  FOR SELECT USING ((select auth.uid()) = owner_id);
```

### Правила миграций

1. **Всегда используй `public.`** перед именами таблиц
2. **Каждая новая таблица** — включай RLS + создавай политики
3. **CASCADE DELETE** — для дочерних таблиц (form_fields, form_knowledge_files)
4. **DEFAULT значения** — указывай для новых NOT NULL колонок в ALTER TABLE
5. **Индексы** — добавляй для колонок, используемых в WHERE/JOIN/ORDER BY
6. **UUID** — используй `gen_random_uuid()` для первичных ключей
7. **Timestamps** — `TIMESTAMPTZ DEFAULT now()` для created_at/updated_at
8. **НЕ ломай существующие данные** — используй `IF NOT EXISTS`, `IF EXISTS`, значения по умолчанию
9. **Одна миграция = одна логическая единица изменений**

### Паттерн RLS-политик

Используй `(select auth.uid())` вместо `auth.uid()` для оптимизации (вычисляется один раз, а не для каждой строки):

```sql
-- Владелец может читать свои данные
CREATE POLICY "Users can read own data" ON public.table_name
  FOR SELECT USING ((select auth.uid()) = owner_id);

-- Суперадмин может читать всё
CREATE POLICY "Superadmins can read all" ON public.table_name
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND role = 'superadmin'
    )
  );

-- Владелец может изменять свои данные
CREATE POLICY "Owners can update own data" ON public.table_name
  FOR UPDATE USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

-- Публичный доступ к активным формам (для анонимных пользователей)
CREATE POLICY "Public can read active forms" ON public.forms
  FOR SELECT USING (is_active = true);

-- Публичная вставка (leads от анонимных пользователей)
CREATE POLICY "Public can insert leads for active forms" ON public.leads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE id = form_id AND is_active = true
    )
  );
```

### Паттерн для дочерних таблиц (через owner_id формы)

```sql
-- Чтение: владелец формы или суперадмин
CREATE POLICY "Form owner can read" ON public.child_table
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE id = form_id AND owner_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (select auth.uid()) AND role = 'superadmin'
    )
  );
```

## Серверные экшены (Server Actions)

### Два клиента Supabase

```typescript
// Серверный клиент с авторизацией пользователя (через cookies)
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()

// Сервисный клиент — обходит RLS (для админских операций)
import { createClient as createServiceClient } from "@supabase/supabase-js"
const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**Когда какой:**
- `createClient()` (серверный) — для операций от имени текущего пользователя
- `createServiceClient` (сервисный) — для операций, требующих обхода RLS (проверка квот, админские операции)

### Шаблон серверного экшена

```typescript
"use server"

import { createClient } from "@/lib/supabase/server"

export async function myAction(params: MyParams) {
  const supabase = await createClient()

  // 1. Проверка авторизации
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Необходима авторизация")

  // 2. Проверка владельца (для операций с данными)
  const { data: form } = await supabase
    .from("forms")
    .select("owner_id")
    .eq("id", params.formId)
    .single()

  if (form?.owner_id !== user.id) throw new Error("Нет доступа")

  // 3. Валидация входных данных
  if (!params.value) throw new Error("Значение обязательно")

  // 4. Операция с БД
  const { data, error } = await supabase
    .from("table_name")
    .insert({ ... })
    .select()
    .single()

  if (error) throw new Error("Ошибка при создании записи")

  // 5. Вернуть результат
  return data
}
```

### Расположение файлов экшенов

| Файл | Ответственность |
|---|---|
| `app/actions/forms.ts` | CRUD форм, квоты, публикация, тема, язык |
| `app/actions/form-fields.ts` | Поля форм, порядок, CRUD |
| `app/actions/leads.ts` | Заявки, статусы, заметки |
| `app/actions/storage.ts` | Файлы, хранилище, лимиты, изображения опций |
| `app/actions/system-settings.ts` | Глобальные настройки (superadmin) |
| `app/actions/users.ts` | Управление пользователями, квоты, тема, язык |

**Новый экшен** добавляй в существующий файл по тематике. Создавай новый файл только если тематика не подходит ни к одному существующему.

## PostgreSQL-функции

### Существующие функции

| Функция | Назначение |
|---|---|
| `handle_new_user()` | Триггер: создаёт запись в users при регистрации |
| `increment_lead_count(form_id)` | Атомарный инкремент счётчика лидов |
| `increment_daily_test_count(user_id)` | Инкремент дневного счётчика тестов с авто-сбросом |
| `get_daily_test_info(user_id)` | Получение инфо о дневных тестах без инкремента |

### Правила функций

1. **`SECURITY DEFINER`** — функция выполняется от имени создателя (обходит RLS)
2. **`SET search_path = public`** — обязательно для безопасности
3. **Атомарность** — используй функции для операций, требующих атомарности

## Существующие индексы

```
idx_forms_owner_id — forms(owner_id)
idx_forms_slug — forms(slug) UNIQUE
idx_form_fields_form_id — form_fields(form_id)
idx_form_fields_form_key — form_fields(form_id, field_key) UNIQUE
idx_leads_form_id — leads(form_id)
idx_leads_lead_status — leads(lead_status)
idx_form_knowledge_files_form_id — form_knowledge_files(form_id)
```

## Безопасность — чеклист

- [ ] RLS включен на таблице
- [ ] Политики покрывают все нужные операции (SELECT, INSERT, UPDATE, DELETE)
- [ ] Используется `(select auth.uid())` в политиках
- [ ] `SECURITY DEFINER` + `SET search_path = public` для функций
- [ ] `SUPABASE_SERVICE_ROLE_KEY` используется ТОЛЬКО на сервере
- [ ] CASCADE DELETE для дочерних таблиц
- [ ] Номер миграции правильный (проверен через `ls supabase/`)
