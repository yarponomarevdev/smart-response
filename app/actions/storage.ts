/**
 * Server Actions для работы с хранилищем
 * - getStorageUsage: получение использования хранилища пользователя
 * - checkStorageLimit: проверка лимита хранилища перед загрузкой файла
 * - getDailyTestInfo: получение информации о тестированиях за день
 */
"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Получает информацию об использовании хранилища пользователя
 * Суммирует размеры всех файлов базы знаний по всем формам пользователя
 */
export async function getStorageUsage(userId: string): Promise<{
  currentUsage: number
  limit: number | null
}> {
  // Получаем лимит хранилища пользователя
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("max_storage")
    .eq("id", userId)
    .single()

  const limit = user?.max_storage ?? null // NULL = неограниченно

  // Получаем все формы пользователя
  const { data: forms } = await supabaseAdmin
    .from("forms")
    .select("id")
    .eq("owner_id", userId)

  if (!forms || forms.length === 0) {
    return { currentUsage: 0, limit }
  }

  const formIds = forms.map(f => f.id)

  // Суммируем размеры всех файлов базы знаний
  const { data: files } = await supabaseAdmin
    .from("form_knowledge_files")
    .select("file_size")
    .in("form_id", formIds)

  const currentUsage = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0

  return { currentUsage, limit }
}

/**
 * Проверяет, не превысит ли загрузка файла лимит хранилища
 */
export async function checkStorageLimit(
  userId: string,
  fileSize: number
): Promise<{ canUpload: boolean; currentUsage: number; limit: number | null }> {
  const { currentUsage, limit } = await getStorageUsage(userId)

  // Если лимит NULL (неограниченно), всегда разрешаем
  if (limit === null) {
    return { canUpload: true, currentUsage, limit }
  }

  // Проверяем, не превысит ли загрузка лимит
  const canUpload = currentUsage + fileSize <= limit

  return { canUpload, currentUsage, limit }
}

/**
 * Получает информацию о тестированиях за день (без инкремента)
 */
export async function getDailyTestInfo(userId: string): Promise<{
  currentCount: number
  limit: number | null
  resetDate: string
}> {
  const { data, error } = await supabaseAdmin.rpc("get_daily_test_info", { user_id: userId })

  if (error || !data || data.length === 0) {
    console.error("Error getting daily test info:", error)
    return { currentCount: 0, limit: 50, resetDate: new Date().toISOString().split("T")[0] }
  }

  const result = data[0]
  return {
    currentCount: result.current_count || 0,
    limit: result.max_limit, // может быть NULL для superadmin
    resetDate: result.reset_date || new Date().toISOString().split("T")[0],
  }
}

/**
 * Инкрементирует счетчик тестирований и проверяет лимит
 */
export async function incrementDailyTestCount(userId: string): Promise<{
  canTest: boolean
  currentCount: number
  limit: number | null
}> {
  const { data, error } = await supabaseAdmin.rpc("increment_daily_test_count", { user_id: userId })

  if (error || !data || data.length === 0) {
    console.error("Error incrementing daily test count:", error)
    // По умолчанию разрешаем тестирование при ошибке
    return { canTest: true, currentCount: 0, limit: null }
  }

  const result = data[0]
  return {
    canTest: result.can_test,
    currentCount: result.current_count || 0,
    limit: result.max_limit, // может быть NULL для superadmin
  }
}
