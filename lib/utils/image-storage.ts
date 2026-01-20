/**
 * Утилиты для сохранения изображений в Supabase Storage
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BUCKET_NAME = "generated-images"

interface SaveBase64ImageParams {
  base64: string
  leadId: string
  contentType?: string
}

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
      console.error("[ImageStorage] Не удалось получить изображение:", response.statusText)
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
      console.error("[ImageStorage] Ошибка загрузки:", error)
      return null
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error("[ImageStorage] Ошибка сохранения изображения:", error)
    return null
  }
}

/**
 * Сохраняет изображение в Supabase Storage из base64
 * @param base64 - Base64 без префикса data:
 * @param leadId - ID лида для уникального имени файла
 * @param contentType - MIME тип изображения
 */
export async function saveBase64ImageToStorage({
  base64,
  leadId,
  contentType = "image/png",
}: SaveBase64ImageParams): Promise<string | null> {
  if (!base64) return null

  try {
    const normalizedBase64 = base64.includes(",") ? base64.split(",").pop() || "" : base64
    if (!normalizedBase64) return null

    const buffer = Buffer.from(normalizedBase64, "base64")
    const timestamp = Date.now()
    const extension = contentType.includes("webp") ? "webp" : "png"
    const fileName = `${leadId}-${timestamp}.${extension}`
    const filePath = `leads/${fileName}`

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType,
        cacheControl: "31536000",
        upsert: false,
      })

    if (error) {
      console.error("[ImageStorage] Ошибка загрузки base64:", error)
      return null
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error("[ImageStorage] Ошибка сохранения base64 изображения:", error)
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
      console.error("[ImageStorage] Некорректный формат URL:", imageUrl)
      return false
    }

    const filePath = pathMatch[1]

    // Удаляем файл
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error("[ImageStorage] Ошибка удаления:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[ImageStorage] Ошибка удаления изображения:", error)
    return false
  }
}
