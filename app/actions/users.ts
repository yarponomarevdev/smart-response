/**
 * Server Actions для работы с пользователями
 * - getAllUsers: получение всех пользователей (только для суперадминов)
 * - updateUserQuotas: обновление квот пользователя (только для суперадминов)
 */
"use server"

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface UserWithStats {
  id: string
  email: string
  role: string
  created_at: string
  form_count: number
  lead_count: number
  max_forms: number | null
  max_leads: number | null
  can_publish_forms: boolean
}

interface UpdateUserQuotasParams {
  userId: string
  max_forms?: number | null
  max_leads?: number | null
  can_publish_forms?: boolean
}

/**
 * Получает всех пользователей с их статистикой (только для суперадминов)
 */
export async function getAllUsers(): Promise<{ users: UserWithStats[] } | { error: string }> {
  // Получаем текущего пользователя через серверный клиент
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Не авторизован" }
  }

  // Проверяем, является ли пользователь суперадмином
  const { data: currentUser } = await supabaseAdmin.from("users").select("role").eq("id", user.id).single()

  if (currentUser?.role !== "superadmin") {
    return { error: "Доступ запрещён" }
  }

  // Получаем всех пользователей через admin клиент (обходит RLS)
  const { data: usersData, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })

  if (error || !usersData) {
    return { error: error?.message || "Ошибка получения пользователей" }
  }

  // Получаем статистику для каждого пользователя
  // Используем один запрос с JOIN вместо множественных запросов для каждой формы
  // Убираем синхронизацию счетчиков - они должны быть актуальными благодаря increment_lead_count
  // Если нужна синхронизация, делайте её отдельным фоновым процессом, а не при каждом запросе
  const usersWithStats = await Promise.all(
    usersData.map(async (user) => {
      const { data: forms } = await supabaseAdmin
        .from("forms")
        .select("id, lead_count")
        .eq("owner_id", user.id)

      const formCount = forms?.length || 0
      const leadCount = forms?.reduce((sum, f) => sum + (f.lead_count || 0), 0) || 0

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        form_count: formCount,
        lead_count: leadCount,
        max_forms: user.max_forms ?? null,
        max_leads: user.max_leads ?? null,
        can_publish_forms: user.can_publish_forms ?? true,
      }
    }),
  )

  // Сортируем по ролям: superadmin -> admin -> user
  // Внутри каждой группы сортируем по дате создания (новые сверху)
  const rolePriority: Record<string, number> = {
    superadmin: 1,
    admin: 2,
    user: 3,
  }

  const sortedUsers = usersWithStats.sort((a, b) => {
    const priorityA = rolePriority[a.role] || 99
    const priorityB = rolePriority[b.role] || 99
    
    // Сначала по роли
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }
    
    // Затем по дате создания (новые сверху)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return { users: sortedUsers }
}

/**
 * Обновляет квоты пользователя (только для суперадминов)
 */
export async function updateUserQuotas(
  params: UpdateUserQuotasParams
): Promise<{ success: boolean } | { error: string }> {
  // Получаем текущего пользователя через серверный клиент
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Не авторизован" }
  }

  // Проверяем, является ли пользователь суперадмином
  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (currentUser?.role !== "superadmin") {
    return { error: "Доступ запрещён" }
  }

  // Нельзя изменять квоты самому себе (защита от случайного самоограничения)
  if (params.userId === user.id) {
    return { error: "Нельзя изменять собственные квоты" }
  }

  // Формируем объект для обновления
  const updateData: Record<string, unknown> = {}
  
  if (params.max_forms !== undefined) {
    updateData.max_forms = params.max_forms
  }
  if (params.max_leads !== undefined) {
    updateData.max_leads = params.max_leads
  }
  if (params.can_publish_forms !== undefined) {
    updateData.can_publish_forms = params.can_publish_forms
  }

  if (Object.keys(updateData).length === 0) {
    return { error: "Нет данных для обновления" }
  }

  // Обновляем квоты пользователя
  const { data, error } = await supabaseAdmin
    .from("users")
    .update(updateData)
    .eq("id", params.userId)
    .select()

  if (error) {
    console.error("Error updating user quotas:", error)
    return { error: "Ошибка обновления квот: " + error.message }
  }

  // Проверяем, что обновление действительно произошло
  if (!data || data.length === 0) {
    console.error("No rows updated for user:", params.userId)
    return { error: "Пользователь не найден или обновление не выполнено" }
  }

  return { success: true }
}

/**
 * Получает язык пользователя
 */
export async function getUserLanguage(userId: string): Promise<{ language: string | null; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("language")
    .eq("id", userId)
    .single()

  if (error) {
    console.error("Error fetching user language:", error)
    return { language: null, error: error.message }
  }

  return { language: data?.language || "ru" }
}

/**
 * Обновляет язык пользователя
 */
export async function updateUserLanguage(
  userId: string,
  language: string
): Promise<{ success: boolean; error?: string }> {
  // Валидация языка
  if (!["ru", "en"].includes(language)) {
    return { success: false, error: "Недопустимое значение языка" }
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ language })
    .eq("id", userId)

  if (error) {
    console.error("Error updating user language:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}


