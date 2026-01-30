/**
 * Server Actions для работы с формами
 * - createUserForm: создание новой формы для пользователя
 * - deleteUserForm: удаление формы пользователя
 * - canCreateMoreForms: проверка лимита форм
 * - updateFormNotificationSetting: обновление настройки уведомлений владельцу
 * - updateFormRespondentEmailSetting: обновление настройки отправки email респондентам
 * - updateFormTheme: обновление темы формы
 */
"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Проверяет, может ли пользователь создать ещё форму
 * Использует max_forms из таблицы users (NULL = неограниченно)
 */
export async function canCreateMoreForms(userId: string): Promise<{ canCreate: boolean; currentCount: number; limit: number | null; canPublish: boolean }> {
  // Получаем данные пользователя включая квоты
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("role, max_forms, can_publish_forms")
    .eq("id", userId)
    .single()

  // Получаем текущее количество форм
  const { count } = await supabaseAdmin
    .from("forms")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)

  const currentCount = count || 0
  const canPublish = user?.can_publish_forms ?? true
  const maxForms = user?.max_forms ?? null // NULL = неограниченно

  // Если max_forms = NULL, лимита нет
  if (maxForms === null) {
    return { canCreate: canPublish, currentCount, limit: null, canPublish }
  }

  // Проверяем лимит
  const canCreate = canPublish && currentCount < maxForms

  return { canCreate, currentCount, limit: maxForms, canPublish }
}

/**
 * Создаёт новую форму для пользователя
 */
export async function createUserForm(userId: string, userEmail: string, formName?: string) {
  // Проверяем лимит форм и права на публикацию
  const { canCreate, canPublish, currentCount, limit } = await canCreateMoreForms(userId)
  
  if (!canPublish) {
    return { error: "Публикация форм отключена для вашего аккаунта. Свяжитесь с администратором." }
  }
  
  if (!canCreate) {
    const limitText = limit !== null ? `${currentCount}/${limit}` : currentCount.toString()
    return { error: `Достигнут лимит форм (${limitText}). Для увеличения лимита свяжитесь с администратором.` }
  }

  // Убеждаемся что пользователь существует в public.users
  const { data: existingUser } = await supabaseAdmin.from("users").select("id").eq("id", userId).single()

  if (!existingUser) {
    const { error: userError } = await supabaseAdmin.from("users").insert({
      id: userId,
      email: userEmail,
      role: "user",
    })

    if (userError) {
      console.error("Ошибка создания пользователя:", userError)
      return { error: "Ошибка создания пользователя: " + userError.message }
    }
  }

  // Создаём форму с дефолтными значениями (все настройки теперь в колонках forms)
  const { data: newForm, error: formError } = await supabaseAdmin
    .from("forms")
    .insert({
      owner_id: userId,
      name: formName || "Моя форма",
      lead_limit: 20,
      lead_count: 0,
      is_active: false,
      // Дефолтные значения для контента (остальные берутся из DEFAULT в БД)
      page_subtitle: "Получите детальный анализ вашего сайта за 30 секунд",
      disclaimer: "Бесплатно • Занимает 30 секунд",
      email_subtitle: "Введите email чтобы получить полный анализ",
      ai_system_prompt: "You are an expert business consultant. Analyze the provided website and generate clear, actionable recommendations in Russian.",
      loading_messages: ["Анализируем сайт...", "Генерируем рекомендации...", "Почти готово..."],
    })
    .select()
    .single()

  if (formError) {
    console.error("Ошибка создания формы:", formError)
    return { error: "Ошибка создания формы: " + formError.message }
  }

  return { form: newForm }
}

/**
 * Проверяет, является ли пользователь владельцем формы
 */
export async function isFormOwner(userId: string | null, formId: string): Promise<boolean> {
  if (!userId) return false
  
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("owner_id")
    .eq("id", formId)
    .single()

  return form?.owner_id === userId
}

/**
 * Удаляет форму пользователя
 */
export async function deleteUserForm(userId: string, formId: string) {
  // Проверяем что форма принадлежит пользователю или пользователь админ
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .single()

  const isSuperAdmin = user?.role === "superadmin"

  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("owner_id")
    .eq("id", formId)
    .single()

  if (!form) {
    return { error: "Форма не найдена" }
  }

  if (form.owner_id !== userId && !isSuperAdmin) {
    return { error: "Нет прав на удаление этой формы" }
  }

  // Удаляем форму (связанный контент и лиды удалятся каскадно)
  const { error } = await supabaseAdmin
    .from("forms")
    .delete()
    .eq("id", formId)

  if (error) {
    console.error("Ошибка удаления формы:", error)
    return { error: "Ошибка удаления формы: " + error.message }
  }

  return { success: true }
}

/**
 * Проверяет права владельца на форму
 */
async function verifyFormOwnership(userId: string, formId: string) {
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("owner_id")
    .eq("id", formId)
    .single()

  if (!form) {
    return { error: "Форма не найдена" }
  }

  if (form.owner_id !== userId) {
    return { error: "Нет прав на изменение этой формы" }
  }

  return { success: true }
}

/**
 * Обновляет поле формы (общая функция)
 */
async function updateFormField<T>(
  userId: string,
  formId: string,
  field: string,
  value: T,
  errorMessage: string
) {
  const ownershipCheck = await verifyFormOwnership(userId, formId)
  if (ownershipCheck.error) return ownershipCheck

  const { error } = await supabaseAdmin
    .from("forms")
    .update({ [field]: value })
    .eq("id", formId)

  if (error) {
    console.error(`Ошибка обновления ${field}:`, error)
    return { error: `${errorMessage}: ${error.message}` }
  }

  return { success: true }
}

/**
 * Обновляет настройку email уведомлений для формы
 */
export async function updateFormNotificationSetting(userId: string, formId: string, notifyOnNewLead: boolean) {
  return updateFormField(userId, formId, "notify_on_new_lead", notifyOnNewLead, "Ошибка обновления настройки")
}

/**
 * Обновляет настройку отправки email респондентам для формы
 */
export async function updateFormRespondentEmailSetting(userId: string, formId: string, sendEmailToRespondent: boolean) {
  return updateFormField(userId, formId, "send_email_to_respondent", sendEmailToRespondent, "Ошибка обновления настройки")
}

/**
 * Обновляет тему формы
 */
export async function updateFormTheme(userId: string, formId: string, theme: "light" | "dark") {
  return updateFormField(userId, formId, "theme", theme, "Ошибка обновления темы")
}

/**
 * Обновляет язык системных сообщений формы
 */
export async function updateFormLanguage(userId: string, formId: string, language: "ru" | "en") {
  return updateFormField(userId, formId, "language", language, "Ошибка обновления языка")
}