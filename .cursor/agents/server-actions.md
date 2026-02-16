---
name: server-actions
model: claude-4.6-opus-high-thinking
description: Субагент для создания серверных экшенов и API-роутов в SmartResponse. Авторизация, валидация, Supabase-клиенты, CORS, обработка ошибок, квоты.
---

# Server Actions & API Routes Agent

## Когда использовать

Вызывай этого агента при:
- Создании/изменении Server Actions в `app/actions/`
- Создании/изменении API Routes в `app/api/`
- Работе с авторизацией и проверками доступа
- Интеграции с Supabase на серверной стороне
- Проверке квот и лимитов
- Отправке email-уведомлений

## Обязательные действия перед началом

1. **Прочитай существующие экшены** в `app/actions/` — понять паттерны и не дублировать.
2. **Определи контекст** — Server Action или API Route? Разные подходы.
3. **Определи клиент Supabase** — серверный (с cookie auth) или сервисный (обход RLS).

## Два клиента Supabase

### Серверный клиент (с авторизацией пользователя)

```typescript
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()
```

Когда: операции от имени текущего пользователя. RLS-политики применяются.

### Сервисный клиент (обход RLS)

```typescript
import { createClient as createServiceClient } from "@supabase/supabase-js"
const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

Когда: админские операции, проверка квот, межпользовательские запросы. **ТОЛЬКО на сервере.**

## Существующие Server Actions

### app/actions/forms.ts
- `canCreateMoreForms(userId)` — проверка лимита
- `createUserForm(userId, userEmail, formName?)` — создание формы
- `isFormOwner(userId, formId)` — проверка владельца
- `deleteUserForm(userId, formId)` — удаление
- `updateFormNotificationSetting` — уведомления
- `updateFormRespondentEmailSetting` — email респондентам
- `updateFormTheme` / `updateFormLanguage` — тема/язык
- `updateStaticLayoutFields` — статичные поля
- `toggleFormPublishStatus` — публикация

### app/actions/form-fields.ts
- `getFormFields` / `saveFormField` / `deleteFormField` / `reorderFormFields`

### app/actions/leads.ts
- `createLead` / `updateLead` / `deleteLead`

### app/actions/storage.ts
- `getStorageUsage` / `checkStorageLimit` — квоты хранилища
- `getDailyTestInfo` / `incrementDailyTestCount` — дневные тесты
- `uploadOptionImage` / `deleteOptionImage` — изображения опций

### app/actions/users.ts
- `getAllUsers` / `updateUserQuotas` / `exportUsersToCSV` — superadmin
- `ensureUserExists` / `getUserLanguage` / `updateUserLanguage`
- `getUserTheme` / `updateUserTheme` / `updateUserEmail` / `updateUserPassword`
- `deleteUserAccount`

### app/actions/system-settings.ts
- `getSystemSetting` / `getAllSystemSettings` / `updateSystemSetting` — superadmin
- `getGlobalTextPrompt` / `getGlobalImagePrompt` / `getTextModel` / `getImageModel`

## Существующие API Routes

| Роут | Метод | Назначение |
|---|---|---|
| `/api/generate` | POST | AI-генерация (стриминг текста, изображения) |
| `/api/check-usage` | GET | Проверка лимитов генерации |
| `/api/send-email` | POST | Отправка email через Resend |
| `/api/improve-prompt` | POST | AI-улучшение промптов |
| `/api/knowledge-files` | GET/POST/DELETE | CRUD файлов базы знаний |
| `/api/user-theme` | GET/POST | Тема пользователя |
| `/api/version` | GET | Версия приложения |

## Шаблон Server Action

```typescript
"use server"

import { createClient } from "@/lib/supabase/server"

export async function myAction(params: MyParams) {
  const supabase = await createClient()

  // 1. Авторизация
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Необходима авторизация")

  // 2. Проверка доступа (владелец / суперадмин)
  const { data: form } = await supabase
    .from("forms")
    .select("owner_id")
    .eq("id", params.formId)
    .single()
  if (form?.owner_id !== user.id) throw new Error("Нет доступа")

  // 3. Валидация
  if (!params.value) throw new Error("Значение обязательно")

  // 4. Операция
  const { data, error } = await supabase
    .from("table")
    .insert({ ... })
    .select()
    .single()

  if (error) throw new Error("Ошибка при создании")

  // 5. Результат
  return data
}
```

## Шаблон API Route

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Логика...

    return NextResponse.json({ data }, { headers: corsHeaders })
  } catch (error) {
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500, headers: corsHeaders }
    )
  }
}
```

## Email (Resend)

```typescript
import { Resend } from "resend"
const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: "Smart Response <noreply@domain.com>",
  to: email,
  subject: "Результат",
  html: renderedHtml,
})
```

Триггеры:
- Новый лид → уведомление владельцу формы (если `notify_on_new_lead`)
- Результат → email респонденту (если `send_email_to_respondent`)

## Паттерны и правила

1. **`"use server"`** — обязательно в начале файла экшенов
2. **Авторизация** — в начале КАЖДОГО экшена
3. **Проверка владельца** — перед ЛЮБОЙ мутацией
4. **Суперадмин-проверка** — для админских операций через `role = 'superadmin'`
5. **Квоты** — проверяй перед создающими операциями (формы, генерация, файлы)
6. **User-friendly ошибки** — `throw new Error("Понятное сообщение")`
7. **Не дублируй** — добавляй экшен в существующий файл по тематике
8. **CORS** — добавляй для роутов, используемых из встроенных форм
9. **`maxDuration`** — устанавливай для долгих операций (генерация: 300s)

## Чеклист

- [ ] Авторизация проверяется
- [ ] Владелец/суперадмин проверяется для мутаций
- [ ] Ошибки понятны пользователю
- [ ] Правильный клиент Supabase (серверный vs сервисный)
- [ ] CORS-заголовки для публичных API
- [ ] Квоты проверяются перед созданием
- [ ] `"use server"` в начале файла экшенов
