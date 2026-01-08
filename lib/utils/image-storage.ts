/**
 * Утилиты для сохранения изображений в Supabase Storage
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BUCKET_NAME = "generated-images"

/**
 * Скачивает изображение по URL и загружает в Supabase Storage
 * @param imageUrl - URL изображения (временный от OpenAI)
 * @param leadId - ID лида для уникального имени файла
 * @returns Публичный URL изображения в Storage или null при ошибке
 */
export async function saveImageToStorage(
  imageUrl: string,
  leadId: string
): Promise<string | null> {
  try {
    // Скачиваем изображение
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error("[ImageStorage] Failed to fetch image:", response.statusText)
      return null
    }

    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Генерируем имя файла
    const timestamp = Date.now()
    const fileName = `${leadId}-${timestamp}.png`
    const filePath = `leads/${fileName}`

    // Загружаем в Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: "image/png",
        cacheControl: "31536000", // 1 год
        upsert: false,
      })

    if (error) {
      console.error("[ImageStorage] Upload error:", error)
      return null
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error("[ImageStorage] Error saving image:", error)
    return null
  }
}

/**
 * Удаляет изображение из Storage
 * @param imageUrl - Публичный URL изображения
 */
export async function deleteImageFromStorage(imageUrl: string): Promise<boolean> {
  try {
    // Извлекаем путь из URL
    const url = new URL(imageUrl)
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/)
    
    if (!pathMatch) {
      console.error("[ImageStorage] Invalid URL format:", imageUrl)
      return false
    }

    const filePath = pathMatch[1]

    // Удаляем файл
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error("[ImageStorage] Delete error:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[ImageStorage] Error deleting image:", error)
    return false
  }
}
