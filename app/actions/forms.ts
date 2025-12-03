/**
 * Server Actions для работы с формами
 * - createUserForm: создание новой формы для пользователя
 * - deleteUserForm: удаление формы пользователя
 * - canCreateMoreForms: проверка лимита форм
 */
"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// UID пользователей с неограниченным количеством форм (админы)
const UNLIMITED_FORM_USERS = [
  "6cb16c09-6a85-4079-9579-118168e95b06",
]

/**
 * Проверяет, может ли пользователь создать ещё форму
 */
export async function canCreateMoreForms(userId: string): Promise<{ canCreate: boolean; currentCount: number; limit: number | null }> {
  // Проверяем роль пользователя
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .single()

  // Админы и суперадмины могут создавать неограниченно
  const isUnlimited = user?.role === "admin" || user?.role === "superadmin" || UNLIMITED_FORM_USERS.includes(userId)
  
  if (isUnlimited) {
    const { count } = await supabaseAdmin
      .from("forms")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userId)
    
    return { canCreate: true, currentCount: count || 0, limit: null }
  }

  // Обычные пользователи - лимит 1 форма
  const { count } = await supabaseAdmin
    .from("forms")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)

  return { canCreate: (count || 0) < 1, currentCount: count || 0, limit: 1 }
}

/**
 * Создаёт новую форму для пользователя
 */
export async function createUserForm(userId: string, userEmail: string, formName?: string) {
  // Проверяем лимит форм
  const { canCreate } = await canCreateMoreForms(userId)
  
  if (!canCreate) {
    return { error: "Достигнут лимит форм. Для увеличения лимита свяжитесь с администратором." }
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
      console.error("Error creating user:", userError)
      return { error: "Ошибка создания пользователя: " + userError.message }
    }
  }

  // Создаём форму
  const { data: newForm, error: formError } = await supabaseAdmin
    .from("forms")
    .insert({
      owner_id: userId,
      name: formName || "Моя форма",
      lead_limit: 20,
      lead_count: 0,
      is_active: true,
    })
    .select()
    .single()

  if (formError) {
    console.error("Error creating form:", formError)
    return { error: "Ошибка создания формы: " + formError.message }
  }

  // Создаём дефолтный контент для формы
  const defaultContent = [
    { form_id: newForm.id, key: "page_title", value: "Анализ сайта с помощью ИИ" },
    { form_id: newForm.id, key: "page_subtitle", value: "Получите детальный анализ вашего сайта за 30 секунд" },
    { form_id: newForm.id, key: "submit_button", value: "Получить анализ" },
    { form_id: newForm.id, key: "url_placeholder", value: "https://example.com" },
    { form_id: newForm.id, key: "disclaimer", value: "Бесплатно • Занимает 30 секунд" },
    {
      form_id: newForm.id,
      key: "ai_system_prompt",
      value:
        "You are an expert business consultant. Analyze the provided website and generate clear, actionable recommendations in Russian.",
    },
    { form_id: newForm.id, key: "ai_result_format", value: "text" },
    { form_id: newForm.id, key: "loading_message_1", value: "Анализируем сайт..." },
    { form_id: newForm.id, key: "loading_message_2", value: "Генерируем рекомендации..." },
    { form_id: newForm.id, key: "loading_message_3", value: "Почти готово..." },
    { form_id: newForm.id, key: "email_title", value: "Получите результаты" },
    { form_id: newForm.id, key: "email_subtitle", value: "Введите email чтобы получить полный анализ" },
    { form_id: newForm.id, key: "email_button", value: "Получить результат" },
    { form_id: newForm.id, key: "email_placeholder", value: "your@email.com" },
    { form_id: newForm.id, key: "result_title", value: "Ваш результат" },
    { form_id: newForm.id, key: "result_blur_text", value: "Введите email чтобы увидеть полный результат" },
    { form_id: newForm.id, key: "success_title", value: "Готово!" },
    { form_id: newForm.id, key: "success_message", value: "Ваш результат готов" },
    { form_id: newForm.id, key: "share_button", value: "Поделиться" },
    { form_id: newForm.id, key: "download_button", value: "Скачать" },
  ]

  await supabaseAdmin.from("form_content").insert(defaultContent)

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

  const isAdmin = user?.role === "admin" || user?.role === "superadmin" || UNLIMITED_FORM_USERS.includes(userId)

  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("owner_id")
    .eq("id", formId)
    .single()

  if (!form) {
    return { error: "Форма не найдена" }
  }

  if (form.owner_id !== userId && !isAdmin) {
    return { error: "Нет прав на удаление этой формы" }
  }

  // Удаляем форму (связанный контент и лиды удалятся каскадно)
  const { error } = await supabaseAdmin
    .from("forms")
    .delete()
    .eq("id", formId)

  if (error) {
    console.error("Error deleting form:", error)
    return { error: "Ошибка удаления формы: " + error.message }
  }

  return { success: true }
}
