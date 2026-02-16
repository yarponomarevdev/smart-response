---
name: form-builder
model: claude-4.6-opus-high-thinking
description: Субагент для работы с конструктором форм SmartResponse. Создание/редактирование форм, управление полями, drag-and-drop, публичные формы, настройки генерации.
---

# Form Builder Agent

## Когда использовать

Вызывай этого агента при работе с:
- Конструктором форм (редактор в админке)
- Типами полей и их поведением
- Публичными формами (`app/form/[slug]/`)
- Потоком заполнения формы (lead flow)
- Drag-and-drop полей
- Настройками генерации для формы (промпт, тип результата)

## Обязательные действия перед началом работы

1. **Прочитай `components/editor/`** — весь каталог компонентов редактора форм.
2. **Прочитай `app/form/[slug]/page.tsx`** — публичная страница формы.
3. **Прочитай `components/lead-flow.tsx`** — поток заполнения формы респондентом.
4. **Прочитай `app/actions/form-fields.ts`** — CRUD-операции с полями.

## Архитектура форм

### Два представления формы

1. **Редактор** (`app/(main)/`) — админка, где владелец создаёт и настраивает форму
2. **Публичная форма** (`app/form/[slug]/`) — страница, которую заполняют респонденты

### Поток данных формы

```
Владелец создаёт форму (forms таблица)
  → Добавляет поля через редактор (form_fields таблица)
  → Настраивает AI-промпт, тему, уведомления
  → Публикует форму (is_active = true)
  → Респондент открывает /form/{slug}
  → Заполняет поля → шаг email → генерация AI-контента
  → Результат (текст/изображение) → лид создан
```

## Типы полей (form_fields)

| Тип | Описание | Особенности |
|---|---|---|
| `text` | Текстовое поле | Однострочный ввод |
| `url` | URL-поле | Триггерит фетчинг содержимого сайта при генерации |
| `select` | Выпадающий список | Опции хранятся в `options` (JSON массив) |
| `multi-select` | Множественный выбор | Чекбоксы, опции с возможными изображениями |
| `checkbox` | Одиночный чекбокс | Boolean-значение |
| `image` | Загрузка изображения | До 1 MB, конвертируется для мультимодального AI |

### Статичные поля формы (хранятся в `forms`)

Не являются `form_fields`, а прямые колонки в таблице `forms`:
- `static_heading` — основной заголовок
- `static_subheading` — подзаголовок
- `static_body_text` — текст описания
- `static_disclaimer` — дисклеймер

### Свойства поля (form_fields)

```typescript
interface FormField {
  id: string
  form_id: string
  field_key: string        // уникальный ключ в рамках формы
  field_type: FieldType
  label: string
  placeholder?: string
  is_required: boolean
  sort_order: number       // порядок через drag-and-drop
  options?: FieldOption[]  // для select/multi-select
}

interface FieldOption {
  label: string
  value: string
  image_url?: string       // изображение опции (multi-select)
}
```

## Компоненты редактора (components/editor/)

| Компонент | Назначение |
|---|---|
| `form-data-tab.tsx` | Основная вкладка: название, slug, статичные поля |
| `dynamic-fields-tab.tsx` | Управление динамическими полями формы |
| `field-list-item.tsx` | Элемент списка полей (drag handle, превью, действия) |
| `field-type-selector.tsx` | Выбор типа нового поля |
| `field-form.tsx` | Форма редактирования конкретного поля |
| `contacts-tab.tsx` | Настройки сбора контактов |
| `generation-tab.tsx` | AI-промпт и настройки генерации |
| `result-tab.tsx` | Настройки отображения результата |
| `settings-tab.tsx` | Уведомления, лимиты, язык формы |
| `share-tab.tsx` | Публикация, встраивание, QR-код |
| `balance-tab.tsx` | Баланс квот |
| `static-layout-fields.tsx` | Редактирование статичных полей формы |

## Drag-and-Drop полей

Используется `@dnd-kit`:
- `@dnd-kit/core` — ядро DnD
- `@dnd-kit/sortable` — сортируемые списки

Порядок полей сохраняется через `reorderFormFields(userId, formId, fieldIds)` в `app/actions/form-fields.ts`.

## Компоненты публичной формы (lead flow)

Поток заполнения формы респондентом:

| Компонент | Шаг |
|---|---|
| `lead-flow.tsx` | Оркестратор шагов |
| `url-submission-step.tsx` | Ввод URL (если есть url-поле) |
| `contacts-step.tsx` | Заполнение контактных данных |
| `email-capture-step.tsx` | Ввод email |
| `generation-step.tsx` | Анимация генерации + вызов /api/generate |
| `success-step.tsx` | Отображение результата |

## React Query хуки

| Хук | Файл | Назначение |
|---|---|---|
| `useForms` | `lib/hooks/use-forms.ts` | CRUD форм в админке |
| `useFormFields` | `lib/hooks/use-form-fields.ts` | CRUD полей формы |
| `useFormContent` | `lib/hooks/use-form-content.ts` | Контент формы (промпт, настройки) |
| `useLeads` | `lib/hooks/use-leads.ts` | Лиды формы |
| `useKnowledgeFiles` | `lib/hooks/use-knowledge-files.ts` | Файлы базы знаний |
| `useAutosave` | `lib/hooks/use-autosave.ts` | Автосохранение полей редактора |

## Серверные экшены для форм

```typescript
// app/actions/forms.ts
canCreateMoreForms(userId)                     // проверка квоты
createUserForm(userId, userEmail, formName?)   // создание
isFormOwner(userId, formId)                    // проверка владельца
deleteUserForm(userId, formId)                 // удаление
toggleFormPublishStatus(userId, formId)        // публикация
updateFormTheme(userId, formId, theme)         // тема
updateFormLanguage(userId, formId, language)   // язык

// app/actions/form-fields.ts
getFormFields(formId)                          // получение полей
saveFormField(userId, formId, fieldData)       // создание/обновление
deleteFormField(userId, formId, fieldId)       // удаление
reorderFormFields(userId, formId, fieldIds)    // порядок (DnD)
```

## Правила при модификации

1. **Не ломай публичные формы** — изменения в редакторе не должны крашить `/form/[slug]/`
2. **Валидация `is_required`** — обязательные поля проверяются на клиенте в lead flow
3. **Уникальность `field_key`** — в рамках формы ключ должен быть уникальным (индекс `idx_form_fields_form_key`)
4. **Порядок полей** — `sort_order` определяет отображение; после DnD вызывается `reorderFormFields`
5. **Изображения опций** — загружаются в Storage bucket `form-images`, URL сохраняется в `options[].image_url`
6. **Формат опций** — JSON массив `[{ label, value, image_url? }]`

## Чеклист

- [ ] Новое поле работает и в редакторе, и в публичной форме
- [ ] Drag-and-drop корректно сохраняет порядок
- [ ] Required-валидация работает в lead flow
- [ ] Значение поля корректно передаётся в /api/generate
- [ ] Тёмная тема для публичной формы
- [ ] Адаптивность публичной формы (mobile-first)
- [ ] Текст через `useTranslation()` (поддержка ru/en)
