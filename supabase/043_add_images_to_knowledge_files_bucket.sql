-- =============================================================================
-- Миграция: Добавление поддержки изображений в базу знаний
-- Описание: Обновляет allowed_mime_types для bucket knowledge-files
-- Дата: 30.01.2026
-- =============================================================================

-- Обновляем allowed_mime_types для bucket knowledge-files
-- Добавляем поддержку изображений: PNG, JPEG, WebP, GIF, HEIC

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  -- Документы (существующие)
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  -- Изображения (новые)
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/heic'
]
WHERE id = 'knowledge-files';
