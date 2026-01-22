"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useCurrentUser } from "./use-auth"

// ID главной формы
const MAIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"

interface Form {
  id: string
  name: string
  is_active: boolean
  isMain?: boolean
}

interface FormData {
  id: string
  name: string
  is_active: boolean
  owner_id: string
  // UI тексты
  page_title: string | null
  page_subtitle: string | null
  email_title: string | null
  email_subtitle: string | null
  email_placeholder: string | null
  url_placeholder: string | null
  submit_button: string | null
  email_button: string | null
  share_button: string | null
  download_button: string | null
  disclaimer: string | null
  // Loading messages
  loading_messages: string[] | null
  // Result
  result_title: string | null
  result_blur_text: string | null
  result_form_text: string | null
  success_title: string | null
  success_message: string | null
  // AI настройки
  ai_system_prompt: string | null
  ai_result_format: string | null
  use_knowledge_base: boolean | null
  knowledge_url: string | null
  // Контакты
  phone_enabled: boolean | null
  phone_required: boolean | null
  feedback_enabled: boolean | null
  feedback_text: string | null
  gradient_text: string | null
  privacy_url: string | null
  // CTA
  cta_text: string | null
  button_text: string | null
  button_url: string | null
  // Generation step
  gen_title: string | null
  gen_subtitle: string | null
}

interface FormContentData {
  content: Record<string, string>
  loadingMessages: string[]
  systemPrompt: string
  resultFormat: string
}

interface EditorFormsData {
  forms: Form[]
  isSuperAdmin: boolean
}

/**
 * Загрузка списка форм для редактора контента
 */
async function fetchEditorForms(userId: string): Promise<EditorFormsData> {
  const supabase = createClient()

  // Проверяем роль пользователя и email
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single()
  
  const { data: { user } } = await supabase.auth.getUser()
  const userEmail = user?.email || ""
  const canSeeMainForm = userEmail === "hello@vasilkov.digital"

  const isSuperAdmin = userData?.role === "superadmin"

  // Загружаем все формы пользователя
  const { data: userForms } = await supabase
    .from("forms")
    .select("id, name, is_active")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })

  let allForms: Form[] = (userForms || []) as Form[]

  // Для пользователя с доступом к Main form добавляем её
  if (canSeeMainForm) {
    const hasMainForm = allForms.some(f => f.id === MAIN_FORM_ID)
    if (!hasMainForm) {
      const { data: mainForm } = await supabase
        .from("forms")
        .select("id, name, is_active")
        .eq("id", MAIN_FORM_ID)
        .single()
      
      if (mainForm) {
        allForms = [{ ...mainForm, isMain: true }, ...allForms]
      }
    } else {
      allForms = allForms.map(f => f.id === MAIN_FORM_ID ? { ...f, isMain: true } : f)
    }
  } else {
    // Для остальных пользователей скрываем Main form
    allForms = allForms.filter(f => f.id !== MAIN_FORM_ID)
  }

  return { forms: allForms, isSuperAdmin }
}

/**
 * Загрузка контента формы (теперь из таблицы forms)
 */
async function fetchFormContent(formId: string): Promise<FormContentData> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .single()

  if (error || !data) {
    return {
      content: {},
      loadingMessages: ["Analyzing...", "Processing...", "Almost done..."],
      systemPrompt: "",
      resultFormat: "text",
    }
  }

  const form = data as FormData

  // Конвертируем данные формы в формат content для совместимости
  const contentMap: Record<string, string> = {}
  
  // UI тексты
  if (form.page_title) contentMap.page_title = form.page_title
  if (form.page_subtitle) contentMap.page_subtitle = form.page_subtitle
  if (form.email_title) contentMap.email_title = form.email_title
  if (form.email_subtitle) contentMap.email_subtitle = form.email_subtitle
  if (form.email_placeholder) contentMap.email_placeholder = form.email_placeholder
  if (form.url_placeholder) contentMap.url_placeholder = form.url_placeholder
  if (form.submit_button) contentMap.submit_button = form.submit_button
  if (form.email_button) contentMap.email_button = form.email_button
  if (form.share_button) contentMap.share_button = form.share_button
  if (form.download_button) contentMap.download_button = form.download_button
  if (form.disclaimer) contentMap.disclaimer = form.disclaimer
  
  // Result
  if (form.result_title) contentMap.result_title = form.result_title
  if (form.result_blur_text) contentMap.result_blur_text = form.result_blur_text
  if (form.result_form_text) contentMap.result_form_text = form.result_form_text
  if (form.success_title) contentMap.success_title = form.success_title
  if (form.success_message) contentMap.success_message = form.success_message
  
  // AI настройки
  if (form.ai_result_format) contentMap.ai_result_format = form.ai_result_format
  if (form.use_knowledge_base !== null) contentMap.use_knowledge_base = String(form.use_knowledge_base)
  if (form.knowledge_url) contentMap.knowledge_url = form.knowledge_url
  
  // Контакты
  if (form.phone_enabled !== null) contentMap.phone_enabled = String(form.phone_enabled)
  if (form.phone_required !== null) contentMap.phone_required = String(form.phone_required)
  if (form.feedback_enabled !== null) contentMap.feedback_enabled = String(form.feedback_enabled)
  if (form.feedback_text) contentMap.feedback_text = form.feedback_text
  if (form.gradient_text) contentMap.gradient_text = form.gradient_text
  if (form.privacy_url) contentMap.privacy_url = form.privacy_url
  
  // CTA
  if (form.cta_text) contentMap.cta_text = form.cta_text
  if (form.button_text) contentMap.button_text = form.button_text
  if (form.button_url) contentMap.button_url = form.button_url
  
  // Generation step
  if (form.gen_title) contentMap.gen_title = form.gen_title
  if (form.gen_subtitle) contentMap.gen_subtitle = form.gen_subtitle

  // Loading messages (из JSONB массива)
  const loadingMessages = Array.isArray(form.loading_messages) && form.loading_messages.length > 0
    ? form.loading_messages
    : ["Analyzing...", "Processing...", "Almost done..."]

  return {
    content: contentMap,
    loadingMessages,
    systemPrompt: form.ai_system_prompt || "",
    resultFormat: form.ai_result_format || "text",
  }
}

/**
 * Хук для получения списка форм для редактора
 */
export function useEditorForms() {
  const { data: user } = useCurrentUser()

  return useQuery({
    queryKey: ["editorForms", user?.id],
    queryFn: () => fetchEditorForms(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Хук для получения контента формы
 */
export function useFormContent(formId: string | null) {
  return useQuery({
    queryKey: ["formContent", formId],
    queryFn: () => fetchFormContent(formId!),
    enabled: !!formId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Хук для сохранения контента формы (теперь в таблицу forms)
 */
export function useSaveFormContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      formId,
      content,
      loadingMessages,
      systemPrompt,
      resultFormat,
    }: {
      formId: string
      content: Record<string, string>
      loadingMessages: string[]
      systemPrompt: string
      resultFormat: string
    }) => {
      const supabase = createClient()

      // Получаем email пользователя для проверки доступа к Main form
      const { data: { user } } = await supabase.auth.getUser()
      const userEmail = user?.email || ""

      // Защита от редактирования Main form
      if (formId === MAIN_FORM_ID && userEmail !== "hello@vasilkov.digital") {
        throw new Error("Нет прав на редактирование этой формы")
      }

      // Проверяем, что пользователь владелец формы
      const { data: form } = await supabase
        .from("forms")
        .select("owner_id")
        .eq("id", formId)
        .single()
      
      if (!form || (form.owner_id !== user?.id && userEmail !== "hello@vasilkov.digital")) {
        throw new Error("Нет прав на редактирование этой формы")
      }

      // Формируем объект обновления
      const updateData: Record<string, unknown> = {
        // UI тексты
        page_title: content.page_title || null,
        page_subtitle: content.page_subtitle || null,
        email_title: content.email_title || null,
        email_subtitle: content.email_subtitle || null,
        email_placeholder: content.email_placeholder || null,
        url_placeholder: content.url_placeholder || null,
        submit_button: content.submit_button || null,
        email_button: content.email_button || null,
        share_button: content.share_button || null,
        download_button: content.download_button || null,
        disclaimer: content.disclaimer || null,
        // Loading messages
        loading_messages: loadingMessages,
        // Result
        result_title: content.result_title || null,
        result_blur_text: content.result_blur_text || null,
        result_form_text: content.result_form_text || null,
        success_title: content.success_title || null,
        success_message: content.success_message || null,
        // AI настройки
        ai_system_prompt: systemPrompt || null,
        ai_result_format: resultFormat || "text",
        use_knowledge_base: content.use_knowledge_base === "true",
        knowledge_url: content.knowledge_url || null,
        // Контакты
        phone_enabled: content.phone_enabled === "true",
        phone_required: content.phone_required === "true",
        feedback_enabled: content.feedback_enabled === "true",
        feedback_text: content.feedback_text || null,
        gradient_text: content.gradient_text || null,
        privacy_url: content.privacy_url || null,
        // CTA
        cta_text: content.cta_text || null,
        button_text: content.button_text || null,
        button_url: content.button_url || null,
        // Generation step
        gen_title: content.gen_title || null,
        gen_subtitle: content.gen_subtitle || null,
      }

      const { error } = await supabase
        .from("forms")
        .update(updateData)
        .eq("id", formId)

      if (error) throw error

      return { success: true }
    },
    onSuccess: (_, variables) => {
      // Инвалидируем кэш контента этой формы
      queryClient.invalidateQueries({ queryKey: ["formContent", variables.formId] })
    },
  })
}
