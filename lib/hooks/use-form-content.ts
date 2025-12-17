"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useCurrentUser } from "./use-auth"

// ID главной формы
const MAIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"

interface Form {
  id: string
  name: string
  isMain?: boolean
}

interface ContentItem {
  id: string
  key: string
  value: string
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
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })

  let allForms: Form[] = userForms || []

  // Для пользователя с доступом к Main form добавляем её
  if (canSeeMainForm) {
    const hasMainForm = allForms.some(f => f.id === MAIN_FORM_ID)
    if (!hasMainForm) {
      const { data: mainForm } = await supabase
        .from("forms")
        .select("id, name")
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
 * Загрузка контента формы
 */
async function fetchFormContent(formId: string): Promise<FormContentData> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("form_content")
    .select("*")
    .eq("form_id", formId)

  if (error || !data) {
    return {
      content: {},
      loadingMessages: ["Analyzing...", "Processing...", "Almost done..."],
      systemPrompt: "",
      resultFormat: "text",
    }
  }

  const contentMap: Record<string, string> = {}
  const messagesMap: Record<number, string> = {}
  let prompt = ""
  let format = "text"

  data.forEach((item: ContentItem) => {
    if (item.key.startsWith("loading_message_")) {
      // Извлекаем числовой индекс из ключа (например, "loading_message_1" -> 1)
      const index = parseInt(item.key.replace("loading_message_", ""), 10)
      if (!isNaN(index)) {
        messagesMap[index] = item.value
      }
    } else if (item.key === "ai_system_prompt") {
      prompt = item.value
    } else if (item.key === "ai_result_format") {
      format = item.value
    } else {
      contentMap[item.key] = item.value
    }
  })

  // Сортируем сообщения по индексу и собираем в массив
  const messages = Object.keys(messagesMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map(index => messagesMap[index])

  return {
    content: contentMap,
    loadingMessages: messages.length > 0 ? messages : ["Analyzing...", "Processing...", "Almost done..."],
    systemPrompt: prompt || "",
    resultFormat: format,
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
 * Хук для сохранения контента формы
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

      // Защита от редактирования Main form - только hello@vasilkov.digital может её редактировать
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

      // Сохраняем основной контент
      for (const [key, value] of Object.entries(content)) {
        await supabase
          .from("form_content")
          .upsert({ form_id: formId, key, value }, { onConflict: "form_id,key" })
      }

      // Сохраняем сообщения загрузки
      for (let i = 0; i < loadingMessages.length; i++) {
        await supabase
          .from("form_content")
          .upsert(
            { form_id: formId, key: `loading_message_${i + 1}`, value: loadingMessages[i] },
            { onConflict: "form_id,key" }
          )
      }

      // Сохраняем AI настройки
      await supabase
        .from("form_content")
        .upsert({ form_id: formId, key: "ai_system_prompt", value: systemPrompt }, { onConflict: "form_id,key" })

      await supabase
        .from("form_content")
        .upsert({ form_id: formId, key: "ai_result_format", value: resultFormat }, { onConflict: "form_id,key" })

      return { success: true }
    },
    onSuccess: (_, variables) => {
      // Инвалидируем кэш контента этой формы
      queryClient.invalidateQueries({ queryKey: ["formContent", variables.formId] })
    },
  })
}

