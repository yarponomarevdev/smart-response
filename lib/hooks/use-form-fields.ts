/**
 * Хуки для работы с динамическими полями форм
 * Использует React Query для кэширования и синхронизации данных
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getFormFields,
  saveFormField,
  deleteFormField,
  reorderFormFields,
  type FormField,
  type FormFieldInput,
} from "@/app/actions/form-fields"
import { useCurrentUser } from "./use-auth"

// Ключ для кэша полей формы
const FORM_FIELDS_KEY = "form-fields"

/**
 * Хук для загрузки полей формы
 */
export function useFormFields(formId: string | null) {
  return useQuery({
    queryKey: [FORM_FIELDS_KEY, formId],
    queryFn: async () => {
      if (!formId) return { fields: [] }
      const result = await getFormFields(formId)
      if ("error" in result) {
        throw new Error(result.error)
      }
      return result
    },
    enabled: !!formId,
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}

/**
 * Хук для создания/обновления поля формы
 */
export function useSaveFormField() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  return useMutation({
    mutationFn: async ({
      formId,
      fieldData,
    }: {
      formId: string
      fieldData: FormFieldInput
    }) => {
      if (!user?.id) {
        throw new Error("Пользователь не авторизован")
      }
      const result = await saveFormField(user.id, formId, fieldData)
      if ("error" in result) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: (_, variables) => {
      // Инвалидируем кэш полей формы
      queryClient.invalidateQueries({
        queryKey: [FORM_FIELDS_KEY, variables.formId],
      })
    },
  })
}

/**
 * Хук для удаления поля формы
 */
export function useDeleteFormField() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  return useMutation({
    mutationFn: async ({
      formId,
      fieldId,
    }: {
      formId: string
      fieldId: string
    }) => {
      if (!user?.id) {
        throw new Error("Пользователь не авторизован")
      }
      const result = await deleteFormField(user.id, formId, fieldId)
      if ("error" in result) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: (_, variables) => {
      // Инвалидируем кэш полей формы
      queryClient.invalidateQueries({
        queryKey: [FORM_FIELDS_KEY, variables.formId],
      })
    },
  })
}

/**
 * Хук для изменения порядка полей формы
 */
export function useReorderFormFields() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  return useMutation({
    mutationFn: async ({
      formId,
      fieldIds,
    }: {
      formId: string
      fieldIds: string[]
    }) => {
      if (!user?.id) {
        throw new Error("Пользователь не авторизован")
      }
      const result = await reorderFormFields(user.id, formId, fieldIds)
      if ("error" in result) {
        throw new Error(result.error)
      }
      return result
    },
    // Оптимистичное обновление для мгновенной обратной связи
    onMutate: async ({ formId, fieldIds }) => {
      // Отменяем текущие запросы, чтобы не перезаписать оптимистичное обновление
      await queryClient.cancelQueries({
        queryKey: [FORM_FIELDS_KEY, formId],
      })

      // Сохраняем предыдущее значение для отката при ошибке
      const previousFields = queryClient.getQueryData<{ fields: FormField[] }>([
        FORM_FIELDS_KEY,
        formId,
      ])

      // Оптимистично обновляем порядок полей
      if (previousFields) {
        // Создаем мапу для быстрого поиска полей по ID
        const fieldsMap = new Map(previousFields.fields.map((f) => [f.id, f]))
        
        // Создаем новый массив полей в нужном порядке
        const reorderedFields = fieldIds
          .map((id) => fieldsMap.get(id))
          .filter((field): field is FormField => field !== undefined)

        // Обновляем кэш с новым порядком
        queryClient.setQueryData([FORM_FIELDS_KEY, formId], {
          fields: reorderedFields,
        })
      }

      return { previousFields }
    },
    // Откат при ошибке
    onError: (err, variables, context) => {
      if (context?.previousFields) {
        queryClient.setQueryData(
          [FORM_FIELDS_KEY, variables.formId],
          context.previousFields
        )
      }
    },
    // После успеха синхронизируем с сервером (на случай, если порядок изменился)
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: [FORM_FIELDS_KEY, variables.formId],
      })
    },
  })
}

export type { FormField, FormFieldInput }
