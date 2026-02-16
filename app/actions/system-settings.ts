/**
 * Server Actions для работы с системными настройками
 * - getSystemSetting: получение значения настройки
 * - updateSystemSetting: обновление настройки (только для superadmin)
 * - getGlobalTextPrompt: получение глобального промпта для текстового формата
 * - getGlobalImagePrompt: получение глобального промпта для изображений
 */
"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Проверяет, является ли пользователь суперадмином
 */
async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .single()

  return user?.role === "superadmin"
}

/**
 * Получает значение системной настройки по ключу
 */
export async function getSystemSetting(key: string): Promise<{ value: string | null; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Ошибка получения системной настройки:", error)
    return { value: null, error: error.message }
  }

  return { value: data?.value || null }
}

/**
 * Получает глобальный промпт для текстового формата
 * Используется в API /api/generate когда ai_result_format = "text"
 */
export async function getGlobalTextPrompt(): Promise<string | null> {
  const { value } = await getSystemSetting("global_text_prompt")
  return value
}

/**
 * Получает глобальный промпт для генерации изображений
 * Используется в API /api/generate когда ai_result_format = "image"
 */
export async function getGlobalImagePrompt(): Promise<string | null> {
  const { value } = await getSystemSetting("global_image_prompt")
  return value
}

/**
 * Получает выбранную модель для генерации текста
 * Возвращает null если модель не выбрана (без fallback)
 */
export async function getTextModel(): Promise<string | null> {
  const { value } = await getSystemSetting("text_model")
  return value || null
}

/**
 * Получает выбранную модель для генерации изображений
 * Возвращает null если модель не выбрана (без fallback)
 */
export async function getImageModel(): Promise<string | null> {
  const { value } = await getSystemSetting("image_model")
  return value || null
}

/**
 * Обновляет системную настройку (только для суперадминов)
 */
export async function updateSystemSetting(
  userId: string,
  key: string,
  value: string
): Promise<{ success: boolean; error?: string }> {
  // Проверяем права доступа
  const isAdmin = await isSuperAdmin(userId)
  if (!isAdmin) {
    return { success: false, error: "Недостаточно прав для изменения системных настроек" }
  }

  // Пробуем обновить существующую запись
  const { error: updateError } = await supabaseAdmin
    .from("system_settings")
    .update({ value, updated_by: userId })
    .eq("key", key)

  if (updateError) {
    // Если запись не существует, создаём её
    const { error: insertError } = await supabaseAdmin
      .from("system_settings")
      .insert({ key, value, updated_by: userId })

    if (insertError) {
      console.error("Ошибка сохранения системной настройки:", insertError)
      return { success: false, error: insertError.message }
    }
  }

  return { success: true }
}

/**
 * Получает все системные настройки (только для суперадминов)
 */
export async function getAllSystemSettings(
  userId: string
): Promise<{ settings: Record<string, string>; error?: string }> {
  // Проверяем права доступа
  const isAdmin = await isSuperAdmin(userId)
  if (!isAdmin) {
    return { settings: {}, error: "Недостаточно прав для просмотра системных настроек" }
  }

  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .select("key, value")

  if (error) {
    console.error("Ошибка получения системных настроек:", error)
    return { settings: {}, error: error.message }
  }

  const settings: Record<string, string> = {}
  data?.forEach((item) => {
    settings[item.key] = item.value
  })

  return { settings }
}

