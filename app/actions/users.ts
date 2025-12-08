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
  const usersWithStats = await Promise.all(
    usersData.map(async (user) => {
      const { data: forms } = await supabaseAdmin
        .from("forms")
        .select("id, lead_count")
        .eq("owner_id", user.id)

      // Получаем реальное количество лидов для каждой формы и синхронизируем счетчики
      const formsWithRealCount = await Promise.all(
        (forms || []).map(async (form) => {
          // Получаем реальное количество лидов (исключая тестовые)
          const { count: realLeadCount } = await supabaseAdmin
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("form_id", form.id)
            .neq("email", "hello@vasilkov.digital")

          const realCount = realLeadCount || 0
          const storedCount = form.lead_count || 0

          // Если счетчик не синхронизирован, обновляем его
          if (realCount !== storedCount) {
            console.log(`[Users] Syncing lead count for form ${form.id}: ${storedCount} -> ${realCount}`)
            await supabaseAdmin
              .from("forms")
              .update({ lead_count: realCount })
              .eq("id", form.id)
            
            return { ...form, lead_count: realCount }
          }

          return form
        })
      )

      const formCount = formsWithRealCount?.length || 0
      const leadCount = formsWithRealCount?.reduce((sum, f) => sum + (f.lead_count || 0), 0) || 0

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


