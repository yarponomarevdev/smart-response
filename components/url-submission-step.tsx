"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getFormFields, type FormField } from "@/app/actions/form-fields"
import { cn } from "@/lib/utils"

const MAIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"

interface URLSubmissionStepProps {
  onSubmit: (url: string, customFields?: Record<string, unknown>) => void
  formId?: string
}

export function URLSubmissionStep({ onSubmit, formId }: URLSubmissionStepProps) {
  const effectiveFormId = formId || MAIN_FORM_ID

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(true)

  // Динамические поля
  const [dynamicFields, setDynamicFields] = useState<FormField[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({})
  const [fileNames, setFileNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchFields = async () => {
      setContentLoading(true)

      // Загружаем динамические поля
      const fieldsResult = await getFormFields(effectiveFormId)
      if ("fields" in fieldsResult && fieldsResult.fields.length > 0) {
        setDynamicFields(fieldsResult.fields)
        // Инициализируем значения полей
        const initialValues: Record<string, unknown> = {}
        fieldsResult.fields.forEach((field) => {
          if (field.field_type === "checkbox") {
            initialValues[field.field_key] = false
          } else if (field.field_type === "multiselect") {
            initialValues[field.field_key] = []
          } else {
            initialValues[field.field_key] = ""
          }
        })
        setFieldValues(initialValues)
      }

      setContentLoading(false)
    }

    fetchFields()
  }, [effectiveFormId])

  const handleFieldChange = (fieldKey: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [fieldKey]: value }))
    setError(null)
  }

  // Проверка обязательных полей
  const validateRequiredFields = (): boolean => {
    for (const field of dynamicFields) {
      if (field.is_required) {
        const value = fieldValues[field.field_key]
        if (field.field_type === "checkbox" && value !== true) {
          return false
        } else if (field.field_type === "multiselect" && (!Array.isArray(value) || value.length === 0)) {
          return false
        } else if (field.field_type !== "checkbox" && field.field_type !== "multiselect" && !value) {
          return false
        }
      }
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    // Проверяем наличие полей
    if (dynamicFields.length === 0) {
      setError("Форма не настроена")
      return
    }

    // Проверяем обязательные поля
    if (!validateRequiredFields()) {
      setError("Заполните все обязательные поля")
      return
    }

    setIsLoading(true)
    setError(null)

    // Ищем поле URL среди динамических полей, если есть
    const urlField = dynamicFields.find(f => f.field_type === 'url')
    let formattedUrl = ""
    
    if (urlField) {
      const rawUrl = (fieldValues[urlField.field_key] as string) || ""
      if (rawUrl) {
        formattedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`
      }
    }

    const supabase = createClient()

    const { data: forms, error: formError } = await supabase
      .from("forms")
      .select("is_active")
      .eq("id", effectiveFormId)
      .limit(1)

    if (formError || !forms || forms.length === 0) {
      setError("Форма не найдена")
      setIsLoading(false)
      return
    }

    const form = forms[0]

    if (!form.is_active) {
      setError("Форма временно недоступна")
      setIsLoading(false)
      return
    }

    // Передаём URL и кастомные поля
    onSubmit(formattedUrl, dynamicFields.length > 0 ? fieldValues : undefined)
  }

  // Рендер динамического поля
  const renderField = (field: FormField) => {
    const value = fieldValues[field.field_key]

    switch (field.field_type) {
      case "text":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.field_key}
              type="text"
              value={(value as string) || ""}
              onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
              className="h-12 sm:h-14 text-base px-4 sm:px-6 bg-card border-border"
              disabled={isLoading}
              placeholder={field.placeholder || undefined}
            />
          </div>
        )

      case "url":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.field_key}
              type="url"
              value={(value as string) || ""}
              onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
              placeholder={field.placeholder || "https://example.com"}
              className="h-12 sm:h-14 text-base px-4 sm:px-6 bg-card border-border"
              disabled={isLoading}
            />
          </div>
        )

      case "select":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={(value as string) || ""}
              onValueChange={(val) => handleFieldChange(field.field_key, val)}
              disabled={isLoading}
            >
              <SelectTrigger className="h-12 sm:h-14 text-base px-4 sm:px-6 bg-card border-border">
                <SelectValue placeholder="Выберите..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case "multiselect":
        const selectedValues = (value as string[]) || []
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2 p-4 border rounded-lg bg-card">
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.field_key}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleFieldChange(field.field_key, [...selectedValues, option.value])
                      } else {
                        handleFieldChange(field.field_key, selectedValues.filter((v) => v !== option.value))
                      }
                    }}
                    disabled={isLoading}
                  />
                  <Label htmlFor={`${field.field_key}-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case "checkbox":
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.field_key}
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => handleFieldChange(field.field_key, checked)}
              disabled={isLoading}
            />
            <Label htmlFor={field.field_key} className="cursor-pointer">
              {field.field_label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        )

      case "image":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="relative">
              <Input
                id={field.field_key}
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setFileNames((prev) => ({ ...prev, [field.field_key]: file.name }))
                    // Сохраняем base64 для отправки на сервер
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      handleFieldChange(field.field_key, reader.result)
                    }
                    reader.readAsDataURL(file)
                  } else {
                    // Если файл не выбран (отмена), очищаем
                    setFileNames((prev) => {
                      const newNames = { ...prev }
                      delete newNames[field.field_key]
                      return newNames
                    })
                    handleFieldChange(field.field_key, "")
                  }
                }}
                className="hidden"
                disabled={isLoading}
              />
              <div
                onClick={() => document.getElementById(field.field_key)?.click()}
                className={cn(
                  "flex h-12 sm:h-14 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-card px-4 sm:px-6 py-2 text-base shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  !fileNames[field.field_key] && "text-muted-foreground",
                  isLoading && "cursor-not-allowed opacity-50"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {fileNames[field.field_key] || field.placeholder || "Выберите изображение..."}
                  </span>
                </div>
                {fileNames[field.field_key] && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFileNames((prev) => {
                        const newNames = { ...prev }
                        delete newNames[field.field_key]
                        return newNames
                      })
                      handleFieldChange(field.field_key, "")
                      // Очищаем input
                      const input = document.getElementById(field.field_key) as HTMLInputElement
                      if (input) input.value = ""
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )

      // Заголовки и элементы оформления
      case "h1":
        return (
          <h1 key={field.id} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance text-center">
            {field.field_label}
          </h1>
        )

      case "h2":
        return (
          <h2 key={field.id} className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-balance text-center">
            {field.field_label}
          </h2>
        )

      case "h3":
        return (
          <p key={field.id} className="text-base sm:text-lg text-muted-foreground text-balance max-w-xl text-center">
            {field.field_label}
          </p>
        )

      case "disclaimer":
        return (
          <p key={field.id} className="text-xs sm:text-sm text-muted-foreground text-center">
            {field.field_label}
          </p>
        )

      default:
        return null
    }
  }

  // Типы полей, которые являются элементами оформления (не требуют ввода, не оборачиваются в text-left)
  const LAYOUT_TYPES = ["h1", "h2", "h3", "disclaimer"]

  if (contentLoading) {
    return (
      <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500">
        <div className="space-y-4">
          <div className="h-12 w-64 bg-muted animate-pulse rounded" />
          <div className="h-6 w-48 bg-muted animate-pulse rounded mx-auto" />
        </div>
        <div className="w-full max-w-md space-y-4">
          <div className="h-14 bg-muted animate-pulse rounded" />
          <div className="h-14 bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  // Если нет полей, не показываем форму (это дублирует проверку на сервере, но полезно для обновления)
  if (dynamicFields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-in fade-in duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Форма не готова</h1>
          <p className="text-muted-foreground">В этой форме пока нет полей для заполнения.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-in fade-in duration-500 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        
        {/* Все поля в порядке как в редакторе */}
        {dynamicFields.map((field) => {
          // Layout поля (заголовки, дисклеймер, кнопка) рендерятся как есть
          if (LAYOUT_TYPES.includes(field.field_type)) {
            return renderField(field)
          }
          // Input поля оборачиваются в контейнер с text-left
          return (
            <div key={field.id} className="text-left">
              {renderField(field)}
            </div>
          )
        })}

        {error && <p className="text-sm text-destructive text-left">{error}</p>}
        
        {/* Кнопка отправки формы */}
        <Button type="submit" disabled={isLoading} className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold">
          {isLoading ? "Обработка..." : "Продолжить"}
        </Button>
      </form>
    </div>
  )
}
