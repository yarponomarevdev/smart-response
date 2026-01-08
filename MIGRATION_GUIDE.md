# Руководство по применению миграций

## Миграции для вкладки "Ответы"

### 1. Миграция БД для статусов и заметок

```bash
# Через Supabase CLI
supabase db push

# Или вручную выполнить в SQL Editor:
```

Применить файлы в порядке:
1. `supabase/033_add_lead_status_and_notes.sql` - добавляет поля `lead_status` и `notes`
2. `supabase/034_create_generated_images_bucket.sql` - создаёт bucket для изображений

### 2. Создание Storage bucket (если не через миграцию)

В Supabase Dashboard → Storage:
1. Создать новый bucket `generated-images`
2. Сделать его публичным (Public access)
3. Настроить MIME types: `image/png`, `image/jpeg`, `image/webp`
4. Лимит размера файла: 10MB

### 3. Проверка миграций

```sql
-- Проверить новые поля в таблице leads
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('lead_status', 'notes');

-- Проверить bucket
SELECT * FROM storage.buckets WHERE id = 'generated-images';
```

## Основные изменения

### Backend

1. **app/actions/leads.ts**
   - Добавлена функция `updateLead()` для обновления статуса и заметок

2. **lib/hooks/use-leads.ts**
   - Добавлен тип `LeadStatus`
   - Обновлён интерфейс `Lead` с новыми полями
   - Добавлен хук `useUpdateLead()`

3. **lib/utils/image-storage.ts** (новый файл)
   - Утилиты для сохранения изображений в Supabase Storage
   - Функция `saveImageToStorage()` - скачивает и сохраняет изображение
   - Функция `deleteImageFromStorage()` - удаляет изображение

4. **app/api/generate/route.ts**
   - Интеграция сохранения изображений в Storage
   - Изображения теперь сохраняются постоянно, а не используют временные URL

### Frontend

1. **components/leads-view.tsx** (был leads-table.tsx)
   - Переключатель между таблицей и карточками
   - Сохранение режима в localStorage
   - Горизонтальная компактная компоновка

2. **components/lead-card.tsx** (новый)
   - Карточка лида для grid-вида
   - Цветные badges для статусов

3. **components/lead-detail-modal.tsx** (новый)
   - Широкое модальное окно (1152px)
   - Компактный горизонтальный интерфейс
   - Автосохранение заметок (debounce 1 сек)
   - Сворачиваемый результат (по умолчанию скрыт)
   - Обработка ошибок загрузки изображений

### Переводы

Добавлены переводы для:
- Статусы: To-Do, В работе, Готово
- Режимы отображения: Таблица, Карточки
- Поля: Телефон, Заметка
- Ошибки изображений

## Решённые проблемы

### Проблема с изображениями

**Проблема:** OpenAI DALL-E возвращает временные URL, которые истекают через 1-2 часа.

**Решение:** 
- Изображения теперь скачиваются и сохраняются в Supabase Storage
- Используются постоянные публичные URL
- Fallback на временный URL при ошибке сохранения
- Информативное сообщение об ошибке для пользователя

## Статусы лидов

- **todo** (To-Do) - новый лид, требует обработки
- **in_progress** (В работе) - лид в процессе обработки
- **done** (Готово) - лид обработан

Технический статус `status` (completed/processing) остался для отслеживания генерации.
