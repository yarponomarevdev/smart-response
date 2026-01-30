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
}

/**
 * Хук для автосохранения отдельного поля в таблицу forms
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
      isInitializedRef.current = false
    }
  }, [formId])

  // Обновляем значение когда приходит новое initialValue
  useEffect(() => {
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
      
      // Сохраняем напрямую в таблицу forms
      const { error } = await supabase
        .from("forms")
        .update({ [fieldKey]: newValue || null })
        .eq("id", formId)

      if (error) throw error

      if (formId !== formIdRef.current) return

      // Инвалидируем кэш
      await queryClient.invalidateQueries({ queryKey: ["formContent", formId] })

      setStatus("saved")
      
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
      statusTimeoutRef.current = setTimeout(() => {
        if (formId === formIdRef.current) {
          setStatus("idle")
        }
      }, 2000)
    } catch (err) {
      if (formId !== formIdRef.current) return

      console.error("Ошибка автосохранения:", err)
      setStatus("error")
      
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
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
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
      isInitializedRef.current = false
    }
  }, [formId])

  // Обновляем значение когда приходит новое initialValue
  useEffect(() => {
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

      if (formId !== formIdRef.current) return

      // Инвалидируем кэши
      await queryClient.invalidateQueries({ queryKey: ["forms"] })
      await queryClient.invalidateQueries({ queryKey: ["editorForms"] })
      await queryClient.invalidateQueries({ queryKey: ["formSettings", formId] })

      setStatus("saved")
      
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
      statusTimeoutRef.current = setTimeout(() => {
        if (formId === formIdRef.current) {
          setStatus("idle")
        }
      }, 2000)
    } catch (err) {
      if (formId !== formIdRef.current) return

      console.error("Ошибка сохранения названия:", err)
      setStatus("error")
      
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
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
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
 * Хук для автосохранения boolean поля (Switch) в таблицу forms
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
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
        statusTimeoutRef.current = null
      }
      setStatus("idle")
      formIdRef.current = formId
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
      
      // Сохраняем напрямую в таблицу forms
      const { error } = await supabase
        .from("forms")
        .update({ [fieldKey]: newValue })
        .eq("id", formId)

      if (error) throw error

      if (formId !== formIdRef.current) return

      // Инвалидируем кэш
      await queryClient.invalidateQueries({ queryKey: ["formContent", formId] })

      setStatus("saved")
      
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
      statusTimeoutRef.current = setTimeout(() => {
        if (formId === formIdRef.current) {
          setStatus("idle")
        }
      }, 2000)
    } catch (err) {
      if (formId !== formIdRef.current) return

      console.error("Ошибка автосохранения:", err)
      setStatus("error")
      
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

interface UseAutoSaveArrayOptions {
  formId: string | null
  fieldKey: string
  initialValue: string[]
  debounceMs?: number
}

/**
 * Хук для автосохранения массива строк (например, loading_messages) в таблицу forms
 * Каждый элемент массива имеет свой статус для лучшего UX
 */
export function useAutoSaveArray({
  formId,
  fieldKey,
  initialValue,
  debounceMs = 500,
}: UseAutoSaveArrayOptions) {
  const [values, setValues] = useState<string[]>(initialValue)
  const [statuses, setStatuses] = useState<AutoSaveStatus[]>(initialValue.map(() => "idle"))
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusTimeoutRefs = useRef<(NodeJS.Timeout | null)[]>(initialValue.map(() => null))
  const initialValueRef = useRef(initialValue)
  const formIdRef = useRef(formId)
  const isInitializedRef = useRef(false)
  const activeIndexRef = useRef<number | null>(null)
  const queryClient = useQueryClient()

  // Сброс состояния при смене формы
  useEffect(() => {
    if (formId !== formIdRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      statusTimeoutRefs.current.forEach(ref => {
        if (ref) clearTimeout(ref)
      })
      statusTimeoutRefs.current = initialValue.map(() => null)
      setStatuses(initialValue.map(() => "idle"))
      formIdRef.current = formId
      isInitializedRef.current = false
    }
  }, [formId, initialValue])

  // Обновляем значения когда приходит новый initialValue
  useEffect(() => {
    if (timeoutRef.current) return

    if (JSON.stringify(initialValue) !== JSON.stringify(initialValueRef.current) || !isInitializedRef.current) {
      setValues(initialValue)
      setStatuses(initialValue.map(() => "idle"))
      statusTimeoutRefs.current = initialValue.map(() => null)
      initialValueRef.current = initialValue
      isInitializedRef.current = true
    }
  }, [initialValue])

  // Очистка таймаутов при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      statusTimeoutRefs.current.forEach(ref => {
        if (ref) clearTimeout(ref)
      })
    }
  }, [])

  const saveArray = useCallback(async (newValues: string[], changedIndex: number) => {
    if (!formId || formId !== formIdRef.current) return

    // Устанавливаем статус "saving" только для измененного поля
    setStatuses(prev => {
      const newStatuses = [...prev]
      newStatuses[changedIndex] = "saving"
      return newStatuses
    })
    
    try {
      const supabase = createClient()
      
      // Сохраняем массив как JSONB
      const { error } = await supabase
        .from("forms")
        .update({ [fieldKey]: newValues })
        .eq("id", formId)

      if (error) throw error

      if (formId !== formIdRef.current) return

      // Инвалидируем кэш
      await queryClient.invalidateQueries({ queryKey: ["formContent", formId] })

      // Устанавливаем статус "saved" только для измененного поля
      setStatuses(prev => {
        const newStatuses = [...prev]
        newStatuses[changedIndex] = "saved"
        return newStatuses
      })
      
      // Таймаут для сброса статуса в "idle"
      if (statusTimeoutRefs.current[changedIndex]) {
        clearTimeout(statusTimeoutRefs.current[changedIndex]!)
      }
      statusTimeoutRefs.current[changedIndex] = setTimeout(() => {
        if (formId === formIdRef.current) {
          setStatuses(prev => {
            const newStatuses = [...prev]
            newStatuses[changedIndex] = "idle"
            return newStatuses
          })
        }
      }, 2000)
    } catch (err) {
      if (formId !== formIdRef.current) return

      console.error("Ошибка автосохранения массива:", err)
      
      // Устанавливаем статус "error" только для измененного поля
      setStatuses(prev => {
        const newStatuses = [...prev]
        newStatuses[changedIndex] = "error"
        return newStatuses
      })
      
      // Таймаут для сброса статуса в "idle"
      if (statusTimeoutRefs.current[changedIndex]) {
        clearTimeout(statusTimeoutRefs.current[changedIndex]!)
      }
      statusTimeoutRefs.current[changedIndex] = setTimeout(() => {
        if (formId === formIdRef.current) {
          setStatuses(prev => {
            const newStatuses = [...prev]
            newStatuses[changedIndex] = "idle"
            return newStatuses
          })
        }
      }, 3000)
    }
  }, [formId, fieldKey, queryClient])

  const onChangeAt = useCallback((index: number, newValue: string) => {
    const newValues = [...values]
    newValues[index] = newValue
    setValues(newValues)
    activeIndexRef.current = index
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    timeoutRef.current = setTimeout(() => {
      saveArray(newValues, index)
    }, debounceMs)
  }, [values, saveArray, debounceMs])

  const getStatusAt = useCallback((index: number): AutoSaveStatus => {
    return statuses[index] || "idle"
  }, [statuses])

  return { values, onChangeAt, getStatusAt }
}
