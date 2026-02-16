/**
 * Server Actions для работы с динамическими полями форм
 * - getFormFields: получение всех полей формы
 * - saveFormField: создание/обновление поля
 * - deleteFormField: удаление поля
 * - reorderFormFields: изменение порядка полей
 */
"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Типы полей формы
export type FieldType = "text" | "url" | "select" | "multiselect" | "checkbox" | "image" | "h1" | "h2" | "h3" | "disclaimer"

export interface FieldOption {
  value: string
  label: string
  image?: string  // URL картинки в Storage
}

export interface FormField {
  id: string
  form_id: string
  field_type: FieldType
  field_label: string
  field_key: string
  placeholder?: string | null
  is_required: boolean
  options: FieldOption[]
  selection_type?: 'single' | 'multiple' | null  // Тип выбора для select/multiselect
  order_index: number
  created_at: string
  updated_at: string
}

export interface FormFieldInput {
  id?: string
  field_type: FieldType
  field_label: string
  field_key: string
  placeholder?: string
  is_required?: boolean
  options?: FieldOption[]
  selection_type?: 'single' | 'multiple'  // Тип выбора для select/multiselect
  order_index?: number
}

/**
 * Проверяет, является ли пользователь владельцем формы
 */
async function isFormOwner(userId: string, formId: string): Promise<boolean> {
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("owner_id")
    .eq("id", formId)
    .single()

  return form?.owner_id === userId
}

/**
 * Получает все поля формы
 */
export async function getFormFields(formId: string): Promise<{ fields: FormField[] } | { error: string }> {
  const { data: fields, error } = await supabaseAdmin
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("order_index", { ascending: true })

  if (error) {
    console.error("Ошибка получения полей формы:", error)
    return { error: "Ошибка загрузки полей: " + error.message }
  }

  return { fields: fields || [] }
}

/**
 * Создаёт или обновляет поле формы
 */
export async function saveFormField(
  userId: string,
  formId: string,
  fieldData: FormFieldInput
): Promise<{ field: FormField } | { error: string }> {
  // Проверяем владельца формы
  const isOwner = await isFormOwner(userId, formId)
  if (!isOwner) {
    return { error: "Нет прав на редактирование этой формы" }
  }

  const { id, ...data } = fieldData

  if (id) {
    // Обновление существующего поля
    const { data: field, error } = await supabaseAdmin
      .from("form_fields")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("form_id", formId)
      .select()
      .single()

    if (error) {
      console.error("Ошибка обновления поля формы:", error)
      return { error: "Ошибка обновления поля: " + error.message }
    }

    return { field }
  } else {
    // Создание нового поля
    // Получаем максимальный order_index
    const { data: maxOrderData } = await supabaseAdmin
      .from("form_fields")
      .select("order_index")
      .eq("form_id", formId)
      .order("order_index", { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrderData?.order_index ?? -1) + 1

    const { data: field, error } = await supabaseAdmin
      .from("form_fields")
      .insert({
        form_id: formId,
        ...data,
        order_index: data.order_index ?? nextOrder,
      })
      .select()
      .single()

    if (error) {
      console.error("Ошибка создания поля формы:", error)
      return { error: "Ошибка создания поля: " + error.message }
    }

    return { field }
  }
}

/**
 * Удаляет поле формы
 */
export async function deleteFormField(
  userId: string,
  formId: string,
  fieldId: string
): Promise<{ success: boolean } | { error: string }> {
  // Проверяем владельца формы
  const isOwner = await isFormOwner(userId, formId)
  if (!isOwner) {
    return { error: "Нет прав на редактирование этой формы" }
  }

  const { error } = await supabaseAdmin
    .from("form_fields")
    .delete()
    .eq("id", fieldId)
    .eq("form_id", formId)

  if (error) {
    console.error("Ошибка удаления поля формы:", error)
    return { error: "Ошибка удаления поля: " + error.message }
  }

  return { success: true }
}

/**
 * Обновляет порядок полей формы
 */
export async function reorderFormFields(
  userId: string,
  formId: string,
  fieldIds: string[]
): Promise<{ success: boolean } | { error: string }> {
  // Проверяем владельца формы
  const isOwner = await isFormOwner(userId, formId)
  if (!isOwner) {
    return { error: "Нет прав на редактирование этой формы" }
  }

  // Обновляем order_index для каждого поля
  const updates = fieldIds.map((fieldId, index) =>
    supabaseAdmin
      .from("form_fields")
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq("id", fieldId)
      .eq("form_id", formId)
  )

  const results = await Promise.all(updates)
  const hasError = results.some((r) => r.error)

  if (hasError) {
    console.error("Ошибка изменения порядка полей формы:", results.find((r) => r.error)?.error)
    return { error: "Ошибка изменения порядка полей" }
  }

  return { success: true }
}

