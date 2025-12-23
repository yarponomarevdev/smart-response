"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useQueryClient } from "@tanstack/react-query"

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error"

interface UseAutoSaveFieldOptions {
  formId: string | null
  fieldKey: string
  initialValue: string
  debounceMs?: number
  /** Для boolean полей - сохранять "true"/"false" */
  isBoolean?: boolean
}

/**
 * Хук для автосохранения отдельного поля в form_content
 */
export function useAutoSaveField({
  formId,
  fieldKey,
  initialValue,
  debounceMs = 500,
}: UseAutoSaveFieldOptions) {
  const [value, setValue] = useState(initialValue)
  const [status, setStatus] = useState<AutoSaveStatus>("idle")
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialValueRef = useRef(initialValue)
  const formIdRef = useRef(formId)
  const isInitializedRef = useRef(false)
  const queryClient = useQueryClient()

  // Сброс состояния при смене формы
  useEffect(() => {
    if (formId !== formIdRef.current) {
      // Отменяем все pending сохранения для старой формы
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
        statusTimeoutRef.current = null
      }
      setStatus("idle")
      formIdRef.current = formId
      // Сбрасываем флаг инициализации, чтобы обновилось значение при загрузке новых данных
      isInitializedRef.current = false
    }
  }, [formId])

  // Обновляем значение когда приходит новое initialValue (загрузка данных)
  useEffect(() => {
    // Не обновляем извне, если есть несохраненные изменения (таймер активен)
    if (timeoutRef.current) return

    if (initialValue !== initialValueRef.current || !isInitializedRef.current) {
      setValue(initialValue)
      initialValueRef.current = initialValue
      isInitializedRef.current = true
    }
  }, [initialValue])

  // Очистка таймаутов при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    }
  }, [])

  const saveField = useCallback(async (newValue: string) => {
    if (!formId || formId !== formIdRef.current) return

    setStatus("saving")
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("form_content")
        .upsert(
          { form_id: formId, key: fieldKey, value: newValue },
          { onConflict: "form_id,key" }
        )

      if (error) throw error

      // Проверяем, что форма не изменилась во время сохранения
      if (formId !== formIdRef.current) return

      // Инвалидируем кэш, чтобы данные обновились везде (включая другие вкладки)
      await queryClient.invalidateQueries({ queryKey: ["formContent", formId] })

      setStatus("saved")
      
      // Сбрасываем статус через 2 секунды
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
      statusTimeoutRef.current = setTimeout(() => {
        if (formId === formIdRef.current) {
          setStatus("idle")
        }
      }, 2000)
    } catch (err) {
      // Если форма изменилась, не показываем ошибку
      if (formId !== formIdRef.current) return

      console.error("Ошибка автосохранения:", err)
      setStatus("error")
      
      // Сбрасываем статус ошибки через 3 секунды
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
      statusTimeoutRef.current = setTimeout(() => {
        if (formId === formIdRef.current) {
          setStatus("idle")
        }
      }, 3000)
    }
  }, [formId, fieldKey, queryClient])

  const onChange = useCallback((newValue: string) => {
    setValue(newValue)
    
    // Отменяем предыдущий таймаут
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    // Запускаем новый debounce
    timeoutRef.current = setTimeout(() => {
      saveField(newValue)
    }, debounceMs)
  }, [saveField, debounceMs])

  return { value, onChange, status }
}

interface UseAutoSaveFormNameOptions {
  formId: string | null
  initialValue: string
  debounceMs?: number
  maxLength?: number
}

/**
 * Хук для автосохранения названия формы в таблицу forms
 */
export function useAutoSaveFormName({
  formId,
  initialValue,
  debounceMs = 500,
  maxLength = 30,
}: UseAutoSaveFormNameOptions) {
  const [value, setValue] = useState(initialValue)
  const [status, setStatus] = useState<AutoSaveStatus>("idle")
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialValueRef = useRef(initialValue)
  const formIdRef = useRef(formId)
  const isInitializedRef = useRef(false)
  const queryClient = useQueryClient()

  // Сброс состояния при смене формы
  useEffect(() => {
    if (formId !== formIdRef.current) {
      // Отменяем все pending сохранения для старой формы
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
        statusTimeoutRef.current = null
      }
      setStatus("idle")
      formIdRef.current = formId
      // Сбрасываем флаг инициализации, чтобы обновилось значение при загрузке новых данных
      isInitializedRef.current = false
    }
  }, [formId])

  // Обновляем значение когда приходит новое initialValue
  useEffect(() => {
    // Не обновляем извне, если есть несохраненные изменения
    if (timeoutRef.current) return

    if (initialValue !== initialValueRef.current || !isInitializedRef.current) {
      setValue(initialValue)
      initialValueRef.current = initialValue
      isInitializedRef.current = true
    }
  }, [initialValue])

  // Очистка таймаутов при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    }
  }, [])

  const saveFormName = useCallback(async (newValue: string) => {
    if (!formId || !newValue.trim() || newValue.length > maxLength || formId !== formIdRef.current) return

    setStatus("saving")
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("forms")
        .update({ name: newValue })
        .eq("id", formId)

      if (error) throw error

      // Проверяем, что форма не изменилась во время сохранения
      if (formId !== formIdRef.current) return

      // Инвалидируем кэши
      await queryClient.invalidateQueries({ queryKey: ["forms"] })
      await queryClient.invalidateQueries({ queryKey: ["editorForms"] })
      await queryClient.invalidateQueries({ queryKey: ["formSettings", formId] })

      setStatus("saved")
      
      // Сбрасываем статус через 2 секунды
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
      statusTimeoutRef.current = setTimeout(() => {
        if (formId === formIdRef.current) {
          setStatus("idle")
        }
      }, 2000)
    } catch (err) {
      // Если форма изменилась, не показываем ошибку
      if (formId !== formIdRef.current) return

      console.error("Ошибка сохранения названия:", err)
      setStatus("error")
      
      // Сбрасываем статус ошибки через 3 секунды
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
      statusTimeoutRef.current = setTimeout(() => {
        if (formId === formIdRef.current) {
          setStatus("idle")
        }
      }, 3000)
    }
  }, [formId, maxLength, queryClient])

  const onChange = useCallback((newValue: string) => {
    setValue(newValue)
    
    // Отменяем предыдущий таймаут
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    // Запускаем новый debounce только если значение валидно
    if (newValue.trim() && newValue.length <= maxLength) {
      timeoutRef.current = setTimeout(() => {
        saveFormName(newValue)
      }, debounceMs)
    }
  }, [saveFormName, debounceMs, maxLength])

  return { value, onChange, status }
}

interface UseAutoSaveBooleanOptions {
  formId: string | null
  fieldKey: string
  initialValue: boolean
}

/**
 * Хук для автосохранения boolean поля (Switch)
 */
export function useAutoSaveBoolean({
  formId,
  fieldKey,
  initialValue,
}: UseAutoSaveBooleanOptions) {
  const [value, setValue] = useState(initialValue)
  const [status, setStatus] = useState<AutoSaveStatus>("idle")
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialValueRef = useRef(initialValue)
  const formIdRef = useRef(formId)
  const isInitializedRef = useRef(false)
  const queryClient = useQueryClient()

  // Сброс состояния при смене формы
  useEffect(() => {
    if (formId !== formIdRef.current) {
      // Отменяем все pending сохранения для старой формы
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
        statusTimeoutRef.current = null
      }
      setStatus("idle")
      formIdRef.current = formId
      // Сбрасываем флаг инициализации, чтобы обновилось значение при загрузке новых данных
      isInitializedRef.current = false
    }
  }, [formId])

  // Обновляем значение когда приходит новое initialValue
  useEffect(() => {
    if (initialValue !== initialValueRef.current || !isInitializedRef.current) {
      setValue(initialValue)
      initialValueRef.current = initialValue
      isInitializedRef.current = true
    }
  }, [initialValue])

  // Очистка таймаутов при размонтировании
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    }
  }, [])

  const onChange = useCallback(async (newValue: boolean) => {
    if (!formId || formId !== formIdRef.current) return

    setValue(newValue)
    setStatus("saving")
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("form_content")
        .upsert(
          { form_id: formId, key: fieldKey, value: newValue ? "true" : "false" },
          { onConflict: "form_id,key" }
        )

      if (error) throw error

      // Проверяем, что форма не изменилась во время сохранения
      if (formId !== formIdRef.current) return

      // Инвалидируем кэш
      await queryClient.invalidateQueries({ queryKey: ["formContent", formId] })

      setStatus("saved")
      
      // Сбрасываем статус через 2 секунды
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
      statusTimeoutRef.current = setTimeout(() => {
        if (formId === formIdRef.current) {
          setStatus("idle")
        }
      }, 2000)
    } catch (err) {
      // Если форма изменилась, не показываем ошибку
      if (formId !== formIdRef.current) return

      console.error("Ошибка автосохранения:", err)
      setStatus("error")
      
      // Сбрасываем статус ошибки через 3 секунды
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
      statusTimeoutRef.current = setTimeout(() => {
        if (formId === formIdRef.current) {
          setStatus("idle")
        }
      }, 3000)
    }
  }, [formId, fieldKey, queryClient])

  return { value, onChange, status }
}
