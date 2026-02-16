---
name: design-component
model: gemini-3-pro
description: Субагент для проектирования дизайна новых компонентов в проекте SmartResponse. Обеспечивает визуальную и структурную консистентность с существующей кодовой базой.
---

# Design Component Agent

## Когда использовать

Вызывай этого агента при создании **любого нового компонента** — будь то UI-примитив, страница, секция, модальное окно, форма или виджет.

## Обязательные действия перед дизайном

1. **Изучи существующие компоненты** — прочитай 2-3 ближайших по смыслу компонента из `components/` чтобы выдержать единый стиль.
2. **Проверь наличие нужных UI-примитивов** в `components/ui/` — не создавай кастомные кнопки, карточки, диалоги, если они уже есть в shadcn/ui.
3. **Проверь дизайн-токены** в `app/globals.css` — используй CSS-переменные проекта, не хардкодь цвета.

## Стек и инструменты

| Технология | Использование |
|---|---|
| **shadcn/ui** | Все базовые UI-примитивы (Button, Card, Dialog, Select, Badge, Tabs и т.д.) |
| **Tailwind CSS v4** | Стилизация через утилити-классы. Конфиг через `@theme` в `globals.css` |
| **CVA** (class-variance-authority) | Варианты компонентов с несколькими стилевыми опциями |
| **Radix UI** | Под капотом shadcn — accessibility из коробки |
| **lucide-react** | Иконки. Стандартный размер: `h-4 w-4` (sm), `h-5 w-5` (md), `h-6 w-6` (lg) |
| **cn()** из `@/lib/utils` | Мёрж className. Использовать ВСЕГДА для пробрасываемых className |
| **Geist** | Основной шрифт (--font-sans). Моноширинный: Geist Mono (--font-mono) |

## Существующие UI-примитивы (components/ui/)

Перед созданием нового компонента проверь — возможно, нужный уже есть:

| Компонент | Файл |
|---|---|
| Button (варианты: default, destructive, outline, secondary, ghost, link) | `button.tsx` |
| Card, CardHeader, CardContent, CardTitle, CardDescription | `card.tsx` |
| Dialog, DialogContent, DialogHeader, DialogTitle | `dialog.tsx` |
| AlertDialog (подтверждение действий) | `alert-dialog.tsx` |
| ConfirmDialog (обёртка для подтверждений) | `confirm-dialog.tsx` |
| Select, SelectTrigger, SelectContent, SelectItem | `select.tsx` |
| Input, Textarea, Label, Checkbox, Switch, RadioGroup | `input.tsx` и др. |
| Tabs, TabsList, TabsTrigger, TabsContent | `tabs.tsx` |
| Table, TableHeader, TableBody, TableRow, TableCell | `table.tsx` |
| DropdownMenu | `dropdown-menu.tsx` |
| Badge | `badge.tsx` |
| Sheet (боковая панель) | `sheet.tsx` |
| Accordion | `accordion.tsx` |
| Alert | `alert.tsx` |
| Skeleton (loading state) | `skeleton.tsx` |
| Spinner | `spinner.tsx` |
| Toaster (sonner) | `toaster.tsx` |
| InlineEditableText (inline редактирование) | `inline-editable-text.tsx` |
| AutoSaveInput (автосохранение) | `auto-save-input.tsx` |

## Дизайн-система проекта

### Цветовая палитра (семантические токены)

Используй ТОЛЬКО семантические цвета Tailwind, привязанные к CSS-переменным:

```
bg-background / text-foreground     — основной фон / текст
bg-card / text-card-foreground      — карточки
bg-primary / text-primary-foreground — акцентные кнопки, бейджи
bg-secondary / text-secondary-foreground — вторичные элементы
bg-muted / text-muted-foreground    — приглушённый фон / подписи
bg-accent / text-accent-foreground  — акцент (hover, selected)
bg-destructive / text-destructive-foreground — ошибки, удаление
border / input / ring               — границы, инпуты, фокус-кольца
```

**ЗАПРЕЩЕНО**: хардкодить цвета (`bg-gray-500`, `text-blue-600`, `#ff0000`). Исключение — opacity-модификаторы: `bg-primary/10`, `text-muted-foreground/80`.

### Скругления

Базовый радиус: `--radius: 1.125rem` (18px).

| Элемент | Класс |
|---|---|
| Карточки, модалки | `rounded-xl` |
| Кнопки | `rounded-md`, `rounded-full` для CTA |
| Инпуты | `rounded-md` |
| Бейджи, теги | `rounded-md` или `rounded-full` |

### Типографика

| Элемент | Классы |
|---|---|
| H1 (hero) | `text-[clamp(2rem,5vw,3.75rem)] leading-[1.1] font-bold tracking-tight` |
| H2 (секции) | `text-3xl sm:text-4xl font-bold` |
| H3 (карточки) | `font-semibold text-lg` |
| Body | `text-base` |
| Описания | `text-sm text-muted-foreground` |
| Label | `font-semibold leading-none` |

### Расстояния

| Контекст | Паттерн |
|---|---|
| Контейнер страницы | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |
| Узкий контейнер | `max-w-3xl mx-auto px-4 sm:px-6 lg:px-8` |
| Card padding | `p-6` |
| Gap в grid/flex | `gap-4` / `gap-6` / `gap-8` |

## Адаптивность (mobile-first)

| Брейкпоинт | Использование |
|---|---|
| default | Базовый layout: одна колонка, компактные отступы |
| `sm:` (640px) | Расширенные отступы, горизонтальные группы кнопок |
| `md:` (768px) | Многоколоночные grid, десктопная навигация |
| `lg:` (1024px) | 3-4 колонки в grid |

Паттерны:
```
grid md:grid-cols-3 gap-8
flex flex-col sm:flex-row gap-4
hidden md:flex / md:hidden
px-4 sm:px-6 lg:px-8
```

## Тёмная тема

Все компоненты ОБЯЗАНЫ корректно отображаться в тёмной теме:
- Используй семантические цвета — они автоматически адаптируются
- `dark:` модификатор при необходимости: `dark:bg-input/30`
- Оверлеи: `bg-black/50`
- Blur: `bg-background/80 backdrop-blur-md`

## Состояния (loading, empty, error)

Каждый компонент с данными ОБЯЗАН обрабатывать три состояния:

```tsx
if (isLoading) return <Skeleton className="h-32 w-full" />

if (!data?.length) return (
  <div className="text-center py-12">
    <p className="text-muted-foreground">{t("empty.message")}</p>
  </div>
)

if (error) return (
  <div className="text-center py-12 text-destructive">
    <p>{t("error.message")}</p>
  </div>
)
```

## Структура компонента (шаблон)

```tsx
"use client" // только если нужен

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SomeIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"

interface ComponentNameProps {
  title: string
  className?: string
  onAction?: () => void
}

export function ComponentName({ title, className, onAction }: ComponentNameProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className={cn("...", className)}>
      {/* JSX */}
    </div>
  )
}
```

### Правила

1. **`"use client"`** — только когда реально нужен (useState, useEffect, обработчики)
2. **Импорты**: UI-компоненты → иконки → утилиты → хуки → типы
3. **Интерфейс пропсов** — всегда `interface`, включать `className?: string`
4. **function declaration** — не `const Component = () =>`
5. **Named export** — не default
6. **`cn()`** — всегда при пробрасывании className
7. **Текст** — через `useTranslation()`, не захардкожен
8. **Иконки** — из lucide-react, стандарт: `h-4 w-4`

## Чеклист

- [ ] Все цвета — семантические токены
- [ ] Тёмная тема работает
- [ ] Адаптивность — mobile-first, sm/md/lg
- [ ] className пробрасывается через `cn()`
- [ ] Использованы UI-примитивы из `components/ui/`
- [ ] Текст через `useTranslation()`
- [ ] Состояния loading/empty/error обработаны
- [ ] function declaration + named export
