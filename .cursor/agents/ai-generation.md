---
name: ai-generation
model: gpt-5.3-codex-high
description: Субагент для работы с AI-генерацией контента в SmartResponse. Промпты, OpenAI API, Vercel AI SDK, стриминг, мультимодальность, обработка файлов и URL-контента.
---

# AI Generation Agent

## Когда использовать

Вызывай этого агента при работе с:
- Изменениями в `/api/generate` — основной эндпоинт AI-генерации
- Настройкой промптов (системные, пользовательские, глобальные)
- Интеграцией с OpenAI API через Vercel AI SDK
- Обработкой knowledge base файлов для контекста AI
- Фетчингом URL-контента для анализа
- Стримингом ответов

## Обязательные действия перед началом работы

1. **Прочитай `app/api/generate/route.ts`** — основной эндпоинт генерации, понимание потока данных критически важно.
2. **Прочитай `lib/ai/openai.ts`** — настройка клиента AI SDK.
3. **Прочитай `lib/file-parser.ts`** — парсинг файлов базы знаний для включения в контекст.
4. **Проверь `app/actions/system-settings.ts`** — глобальные настройки моделей и промптов.

## Архитектура генерации

### Поток данных

```
Пользователь заполняет форму
  → POST /api/generate
    → Получение настроек формы (промпт, тип генерации)
    → Получение глобальных настроек (модель, системный промпт)
    → Фетчинг URL-контента (если поле url в форме)
    → Загрузка и парсинг knowledge base файлов
    → Композиция финального промпта
    → Вызов AI SDK (streamText)
    → Стриминг ответа
```

### Ключевые файлы

| Файл | Назначение |
|---|---|
| `app/api/generate/route.ts` | Основной POST-эндпоинт генерации (maxDuration = 300) |
| `lib/ai/openai.ts` | Клиент OpenAI через `@ai-sdk/openai` |
| `lib/file-parser.ts` | Парсер файлов: PDF, DOCX, TXT, MD, CSV, JSON, изображения |
| `app/actions/system-settings.ts` | Глобальные промпты и модели AI |
| `app/api/check-usage/route.ts` | Проверка лимитов генерации |
| `app/api/improve-prompt/route.ts` | AI-улучшение промптов |

## Vercel AI SDK — паттерны

### Текстовая генерация (стриминг)

```typescript
import { streamText } from "ai"
import { openai } from "@/lib/ai/openai"

const result = streamText({
  model: openai(modelName), // из system_settings
  system: systemPrompt,     // глобальный + формы
  messages: [
    { role: "user", content: userPrompt }
  ],
  maxTokens: 4096,
})

return result.toDataStreamResponse()
```

### Мультимодальный ввод (изображения в промпте)

```typescript
// Для полей типа "image" — конвертируем в base64 и передаём как content parts
const content = [
  { type: "text", text: userPrompt },
  { type: "image", image: base64ImageData }
]
```

## Композиция промпта

Финальный промпт собирается из нескольких источников в порядке приоритета:

1. **Глобальный системный промпт** (`system_settings.global_text_prompt`) — общие инструкции для всех форм
2. **Промпт формы** (`forms.ai_system_prompt`) — специфичные для формы инструкции
3. **Контекст knowledge base** — тексты из загруженных файлов (до 50000 символов каждый)
4. **URL-контент** — HTML-содержимое сайта, если в форме есть URL-поле
5. **Пользовательские поля** — значения кастомных полей формы

### Фетчинг URL-контента

```
fetch(url) → если 403/429 → fallback на Jina Reader (https://r.jina.ai/{url})
```

Jina Reader — прокси для сайтов с анти-скрейпинг защитой. Это НЕ баг, а ожидаемое поведение.

## Парсинг файлов (file-parser.ts)

Поддерживаемые форматы:
- **PDF** → `pdf-parse`
- **DOCX** → `mammoth`
- **TXT, MD, CSV** → прямое чтение текста
- **JSON** → JSON.stringify с форматированием
- **Изображения (JPEG, PNG, WebP, HEIC)** → base64 для мультимодального API

Лимит: `MAX_TEXT_LENGTH = 50000` символов на файл.

HEIC-изображения автоматически конвертируются в JPEG через `heic-convert`.

## CORS

Эндпоинт `/api/generate` поддерживает CORS для встраивания форм на внешних сайтах:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}
```

## Система квот

Проверка через `/api/check-usage`:
- `max_generations` из таблицы `users` (NULL = безлимит)
- Подсчёт существующих лидов формы
- Возвращает: usageCount, remainingCount, maxCount, hasReachedLimit

## Обработка ошибок

1. **Таймаут** — `maxDuration = 300` (5 минут) для длинных генераций
2. **Rate limiting** — если OpenAI вернул 429, показать user-friendly сообщение
3. **Невалидный URL** — логировать, но не крашить генерацию, пропустить URL-контекст
4. **Пустой knowledge base** — нормальная ситуация, генерировать без контекста
5. **Файл не парсится** — логировать ошибку, пропустить файл, продолжить генерацию

## Чеклист

- [ ] Стриминг работает (не блокирующий ответ для текста)
- [ ] CORS-заголовки на месте для POST и OPTIONS
- [ ] Knowledge base файлы корректно парсятся и включаются в контекст
- [ ] URL-фетчинг с fallback на Jina Reader
- [ ] Квоты проверяются перед генерацией
- [ ] `maxDuration = 300` не убран
- [ ] Ошибки AI SDK обрабатываются и возвращают понятные сообщения
- [ ] Изображения в base64 для мультимодальных запросов
