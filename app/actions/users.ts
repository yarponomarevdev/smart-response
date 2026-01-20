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

  // Сортируем по ролям: superadmin -> user
  // Внутри каждой группы сортируем по дате создания (новые сверху)
  const rolePriority: Record<string, number> = {
    superadmin: 1,
    user: 2,
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
    console.error("Ошибка обновления квот пользователя:", error)
    return { error: "Ошибка обновления квот: " + error.message }
  }

  // Проверяем, что обновление действительно произошло
  if (!data || data.length === 0) {
    console.error("Не обновлено ни одной строки для пользователя:", params.userId)
    return { error: "Пользователь не найден или обновление не выполнено" }
  }

  return { success: true }
}

/**
 * Проверяет существование записи пользователя и создаёт её при необходимости
 * Используется для предотвращения бесконечной загрузки дашборда
 */
export async function ensureUserExists(
  userId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  // Проверяем существование записи
  const { data: existingUser, error: selectError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", userId)
    .single()

  // Если запись существует - всё ок
  if (existingUser) {
    return { success: true }
  }

  // Если запись не найдена (PGRST116) - создаём
  if (selectError?.code === "PGRST116" || !existingUser) {
    const { error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        id: userId,
        email: email,
        role: "user",
        language: "en", // Английский язык по умолчанию
      })

    if (insertError) {
      // Игнорируем ошибку дубликата (запись уже создана)
      if (insertError.code !== "23505") {
        console.error("Ошибка создания записи пользователя:", insertError)
        return { success: false, error: insertError.message }
      }
    }
  }

  return { success: true }
}

/**
 * Получает язык пользователя
 * По умолчанию возвращает 'en' (английский)
 */
export async function getUserLanguage(userId: string): Promise<{ language: string | null; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("language")
    .eq("id", userId)
    .single()

  if (error) {
    console.error("Ошибка получения языка пользователя:", error)
    return { language: "en", error: error.message } // Английский по умолчанию
  }

  return { language: data?.language || "en" } // Английский по умолчанию
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
    console.error("Ошибка обновления языка пользователя:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Обновляет email пользователя
 * Supabase отправит письмо с подтверждением на новый email
 */
export async function updateUserEmail(
  newEmail: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Не авторизован" }
  }

  // Валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(newEmail)) {
    return { success: false, error: "Некорректный формат email" }
  }

  // Обновляем email через Auth API (отправляет письмо с подтверждением)
  const { error } = await supabase.auth.updateUser({ email: newEmail })

  if (error) {
    console.error("Ошибка обновления email пользователя:", error)
    // Обрабатываем специфичные ошибки Supabase
    if (error.message.includes("already registered")) {
      return { success: false, error: "Этот email уже используется" }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Обновляет пароль пользователя
 */
export async function updateUserPassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Не авторизован" }
  }

  // Валидация пароля
  if (newPassword.length < 6) {
    return { success: false, error: "Пароль должен быть не менее 6 символов" }
  }

  // Обновляем пароль через Auth API
  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    console.error("Ошибка обновления пароля пользователя:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Экспортирует всех пользователей в CSV формат (только для суперадминов)
 */
export async function exportUsersToCSV(): Promise<{ csv: string } | { error: string }> {
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

  // Получаем всех пользователей
  const result = await getAllUsers()
  
  if ('error' in result) {
    return { error: result.error }
  }

  const users = result.users

  // Формируем CSV
  const headers = [
    "Email",
    "Роль",
    "Количество форм",
    "Лимит форм",
    "Использовано лидов",
    "Лимит лидов",
    "Публикация разрешена",
    "Дата регистрации"
  ]

  const rows = users.map((user) => {
    const roleText = user.role === "superadmin" ? "Супер-админ" : "Пользователь"
    const formsLimit = user.role === "superadmin" ? "∞" : (user.max_forms ?? 0).toString()
    const leadsLimit = user.role === "superadmin" ? "∞" : (user.max_leads ?? 0).toString()
    const canPublish = user.can_publish_forms ? "Да" : "Нет"
    const registrationDate = new Date(user.created_at).toLocaleString("ru-RU")

    return [
      user.email,
      roleText,
      user.form_count.toString(),
      formsLimit,
      user.lead_count.toString(),
      leadsLimit,
      canPublish,
      registrationDate
    ]
  })

  // Создаем CSV строку с экранированием кавычек
  const escapeCsvValue = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const csvLines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(","))
  ]

  const csv = csvLines.join("\n")

  // Добавляем BOM для корректного отображения кириллицы в Excel
  const csvWithBOM = "\uFEFF" + csv

  return { csv: csvWithBOM }
}

/**
 * Удаляет аккаунт пользователя и все связанные данные
 * Каскадно удаляет: формы, лиды, файлы из storage
 */
export async function deleteUserAccount(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Не авторизован" }
  }

  const userId = user.id

  // Проверяем, не является ли пользователь суперадмином
  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .single()

  if (userData?.role === "superadmin") {
    return { success: false, error: "Суперадмин не может удалить свой аккаунт" }
  }

  try {
    // 1. Получаем все формы пользователя
    const { data: forms } = await supabaseAdmin
      .from("forms")
      .select("id")
      .eq("owner_id", userId)

    const formIds = forms?.map((f) => f.id) || []

    // 2. Удаляем файлы из storage (knowledge_files)
    if (formIds.length > 0) {
      const { data: knowledgeFiles } = await supabaseAdmin
        .from("knowledge_files")
        .select("storage_path")
        .in("form_id", formIds)

      if (knowledgeFiles && knowledgeFiles.length > 0) {
        const storagePaths = knowledgeFiles
          .map((f) => f.storage_path)
          .filter(Boolean) as string[]
        
        if (storagePaths.length > 0) {
          await supabaseAdmin.storage
            .from("knowledge-files")
            .remove(storagePaths)
        }
      }

      // 3. Удаляем записи knowledge_files из БД
      await supabaseAdmin
        .from("knowledge_files")
        .delete()
        .in("form_id", formIds)

      // 4. Удаляем лиды
      await supabaseAdmin
        .from("leads")
        .delete()
        .in("form_id", formIds)

      // 5. Удаляем поля форм
      await supabaseAdmin
        .from("form_fields")
        .delete()
        .in("form_id", formIds)

      // 6. Удаляем формы
      await supabaseAdmin
        .from("forms")
        .delete()
        .eq("owner_id", userId)
    }

    // 7. Удаляем запись пользователя из таблицы users
    await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId)

    // 8. Удаляем пользователя из Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Ошибка удаления пользователя из auth:", authError)
      return { success: false, error: "Ошибка удаления аккаунта из системы авторизации" }
    }

    return { success: true }
  } catch (error) {
    console.error("Ошибка удаления аккаунта пользователя:", error)
    return { success: false, error: "Ошибка удаления аккаунта" }
  }
}
