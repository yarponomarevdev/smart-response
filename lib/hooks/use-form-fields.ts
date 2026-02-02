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
 * Использует optimistic update для мгновенного обновления UI
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
    onMutate: async ({ formId, fieldData }) => {
      // Отменяем текущие запросы
      await queryClient.cancelQueries({
        queryKey: [FORM_FIELDS_KEY, formId],
      })

      const previousFields = queryClient.getQueryData<{ fields: FormField[] }>([
        FORM_FIELDS_KEY,
        formId,
      ])

      // Optimistic: обновляем или добавляем поле
      if (previousFields) {
        const existingFieldIndex = fieldData.id
          ? previousFields.fields.findIndex((f) => f.id === fieldData.id)
          : -1

        let updatedFields: FormField[]
        
        if (existingFieldIndex >= 0) {
          // Обновляем существующее поле
          updatedFields = previousFields.fields.map((f, i) =>
            i === existingFieldIndex
              ? { ...f, ...fieldData, form_id: formId }
              : f
          )
        } else {
          // Добавляем новое поле
          const tempField: FormField = {
            id: `temp-${Date.now()}`,
            form_id: formId,
            field_id: fieldData.field_id || `field-${Date.now()}`,
            field_type: fieldData.field_type,
            label: fieldData.label,
            placeholder: fieldData.placeholder || null,
            required: fieldData.required ?? false,
            options: fieldData.options || null,
            display_order: previousFields.fields.length,
            created_at: new Date().toISOString(),
            heading_text: fieldData.heading_text || null,
            disclaimer_text: fieldData.disclaimer_text || null,
          }
          updatedFields = [...previousFields.fields, tempField]
        }

        queryClient.setQueryData([FORM_FIELDS_KEY, formId], {
          fields: updatedFields,
        })
      }

      return { previousFields }
    },
    onError: (_err, variables, context) => {
      // Откатываем при ошибке
      if (context?.previousFields) {
        queryClient.setQueryData(
          [FORM_FIELDS_KEY, variables.formId],
          context.previousFields
        )
      }
    },
    onSettled: (_, __, variables) => {
      // Принудительно обновляем данные с сервера
      queryClient.refetchQueries({
        queryKey: [FORM_FIELDS_KEY, variables.formId],
      })
    },
  })
}

/**
 * Хук для удаления поля формы
 * Использует optimistic update для мгновенного удаления из UI
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
    onMutate: async ({ formId, fieldId }) => {
      // Отменяем текущие запросы
      await queryClient.cancelQueries({
        queryKey: [FORM_FIELDS_KEY, formId],
      })

      const previousFields = queryClient.getQueryData<{ fields: FormField[] }>([
        FORM_FIELDS_KEY,
        formId,
      ])

      // Optimistic: удаляем поле из списка
      if (previousFields) {
        queryClient.setQueryData([FORM_FIELDS_KEY, formId], {
          fields: previousFields.fields.filter((f) => f.id !== fieldId),
        })
      }

      return { previousFields }
    },
    onError: (_err, variables, context) => {
      // Откатываем при ошибке
      if (context?.previousFields) {
        queryClient.setQueryData(
          [FORM_FIELDS_KEY, variables.formId],
          context.previousFields
        )
      }
    },
    onSettled: (_, __, variables) => {
      // Принудительно обновляем данные с сервера
      queryClient.refetchQueries({
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
    // После успеха принудительно синхронизируем с сервером
    onSettled: (_, __, variables) => {
      queryClient.refetchQueries({
        queryKey: [FORM_FIELDS_KEY, variables.formId],
      })
    },
  })
}

export type { FormField, FormFieldInput }
