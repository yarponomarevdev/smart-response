"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { createUserForm, deleteUserForm, canCreateMoreForms, updateFormNotificationSetting, updateFormRespondentEmailSetting, updateFormTheme } from "@/app/actions/forms"
import { useCurrentUser } from "./use-auth"

interface Form {
  id: string
  name: string
  is_active: boolean
  lead_count: number
  lead_limit: number
  created_at: string
  owner_id: string
  actual_lead_count?: number
  notify_on_new_lead?: boolean
}

interface FormLimitInfo {
  canCreate: boolean
  currentCount: number
  limit: number | null
  canPublish: boolean
}

interface UserFormsData {
  forms: Form[]
  totalLeads: number
  limitInfo: FormLimitInfo | null
  maxLeads: number | null // Лимит лидов пользователя
}

/**
 * Загрузка форм пользователя с подсчетом лидов
 */
async function fetchUserForms(userId: string): Promise<UserFormsData> {
  const supabase = createClient()

  // Загружаем все формы пользователя
  const { data: userForms } = await supabase
    .from("forms")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })

  if (!userForms || userForms.length === 0) {
    const limitInfo = await canCreateMoreForms(userId)
    // Получаем лимит лидов пользователя
    const { data: user } = await supabase
      .from("users")
      .select("max_leads")
      .eq("id", userId)
      .single()
    const maxLeads = user?.max_leads ?? null
    return { forms: [], totalLeads: 0, limitInfo, maxLeads }
  }

  // Для каждой формы получаем реальное количество лидов
  const formsWithLeadCount = await Promise.all(
    userForms.map(async (form) => {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("form_id", form.id)
      
      return {
        ...form,
        actual_lead_count: count || 0,
      }
    })
  )

  // Получаем общее количество лидов для всех форм пользователя
  const formIds = userForms.map(f => f.id)
  const { count: totalCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .in("form_id", formIds)

  // Проверяем лимит форм
  const limitInfo = await canCreateMoreForms(userId)

  // Получаем лимит лидов пользователя
  const { data: user } = await supabase
    .from("users")
    .select("max_leads")
    .eq("id", userId)
    .single()

  const maxLeads = user?.max_leads ?? null

  return {
    forms: formsWithLeadCount,
    totalLeads: totalCount || 0,
    limitInfo,
    maxLeads,
  }
}

/**
 * Хук для получения форм текущего пользователя
 */
export function useUserForms() {
  const { data: user } = useCurrentUser()

  return useQuery({
    queryKey: ["forms", user?.id],
    queryFn: () => fetchUserForms(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут
  })
}

/**
 * Хук для создания новой формы
 */
export function useCreateForm() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  return useMutation({
    mutationFn: async (formName?: string) => {
      if (!user) throw new Error("Пользователь не авторизован")
      const result = await createUserForm(user.id, user.email, formName)
      if (result.error) throw new Error(result.error)
      return result.form
    },
    onSuccess: () => {
      // Инвалидируем кэш форм (все запросы, начинающиеся с ["forms"])
      queryClient.invalidateQueries({ queryKey: ["forms"], exact: false })
      // Инвалидируем кэш форм для редактора (все запросы, начинающиеся с ["editorForms"])
      queryClient.invalidateQueries({ queryKey: ["editorForms"], exact: false })
    },
  })
}

/**
 * Хук для удаления формы
 */
export function useDeleteForm() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  return useMutation({
    mutationFn: async (formId: string) => {
      if (!user) throw new Error("Пользователь не авторизован")
      const result = await deleteUserForm(user.id, formId)
      if (result.error) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      // Инвалидируем кэш форм (все запросы, начинающиеся с ["forms"])
      queryClient.invalidateQueries({ queryKey: ["forms"], exact: false })
      // Инвалидируем кэш форм для редактора (все запросы, начинающиеся с ["editorForms"])
      queryClient.invalidateQueries({ queryKey: ["editorForms"], exact: false })
    },
  })
}

/**
 * Хук для обновления имени формы
 */
export function useUpdateFormName() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ formId, name }: { formId: string; name: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from("forms")
        .update({ name })
        .eq("id", formId)
      
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      // Инвалидируем кэш форм (все запросы, начинающиеся с ["forms"])
      queryClient.invalidateQueries({ queryKey: ["forms"], exact: false })
      // Инвалидируем кэш форм для редактора (все запросы, начинающиеся с ["editorForms"])
      queryClient.invalidateQueries({ queryKey: ["editorForms"], exact: false })
    },
  })
}

/**
 * Хук для переключения активности формы
 */
export function useToggleFormActive() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  return useMutation({
    mutationFn: async ({ formId, currentIsActive }: { formId: string; currentIsActive: boolean }) => {
      const supabase = createClient()
      // Переключаем состояние: если сейчас активна, делаем неактивной, и наоборот
      const newIsActive = !currentIsActive

      // Если пытаемся активировать форму, проверяем наличие полей
      if (newIsActive) {
        const { count, error: countError } = await supabase
          .from("form_fields")
          .select("*", { count: "exact", head: true })
          .eq("form_id", formId)
        
        if (countError) throw new Error(countError.message)
        
        if (count === 0) {
          throw new Error("Нельзя опубликовать пустую форму. Добавьте поля в редакторе.")
        }
      }

      const { error } = await supabase
        .from("forms")
        .update({ is_active: newIsActive })
        .eq("id", formId)
      
      if (error) throw new Error(error.message)
      
      return { formId, newIsActive }
    },
    onSuccess: (data) => {
      // Оптимистично обновляем кэш
      queryClient.setQueryData<UserFormsData>(["forms", user?.id], (old) => {
        if (!old) return old
        return {
          ...old,
          forms: old.forms.map(form => 
            form.id === data.formId 
              ? { ...form, is_active: data.newIsActive }
              : form
          )
        }
      })
      
      // Инвалидируем кэш форм для редактора (все запросы, начинающиеся с ["editorForms"])
      queryClient.invalidateQueries({ queryKey: ["editorForms"], exact: false })
    },
  })
}

/**
 * Фабрика хуков для обновления настроек формы
 */
function createUpdateFormSettingHook<T>(
  updateFn: (userId: string, formId: string, value: T) => Promise<{ success?: boolean; error?: string }>
) {
  return function useUpdateFormSetting() {
    const queryClient = useQueryClient()
    const { data: user } = useCurrentUser()

    return useMutation({
      mutationFn: async ({ formId, value }: { formId: string; value: T }) => {
        if (!user) throw new Error("Пользователь не авторизован")
        const result = await updateFn(user.id, formId, value)
        if (result.error) throw new Error(result.error)
        return result
      },
      onSuccess: () => {
        // Инвалидируем кэш форм (все запросы, начинающиеся с ["forms"])
        queryClient.invalidateQueries({ queryKey: ["forms"], exact: false })
        // Инвалидируем кэш форм для редактора (все запросы, начинающиеся с ["editorForms"])
        queryClient.invalidateQueries({ queryKey: ["editorForms"], exact: false })
        // Инвалидируем кэш настроек формы
        queryClient.invalidateQueries({ queryKey: ["formSettings"], exact: false })
      },
    })
  }
}

/**
 * Хук для обновления настройки уведомлений формы
 */
export const useUpdateFormNotification = createUpdateFormSettingHook(updateFormNotificationSetting)

/**
 * Хук для обновления настройки отправки email респондентам
 */
export const useUpdateFormRespondentEmail = createUpdateFormSettingHook(updateFormRespondentEmailSetting)

/**
 * Хук для обновления темы формы
 */
export const useUpdateFormTheme = createUpdateFormSettingHook(updateFormTheme)

