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
import { Upload, X, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getFormFields, type FormField } from "@/app/actions/form-fields"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"

const MAIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"

interface URLSubmissionStepProps {
  onSubmit: (url: string | null, customFields?: Record<string, unknown>) => void
  formId?: string
}

export function URLSubmissionStep({ onSubmit, formId }: URLSubmissionStepProps) {
  const { t } = useTranslation()
  const effectiveFormId = formId || MAIN_FORM_ID

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(true)

  // Динамические поля
  const [dynamicFields, setDynamicFields] = useState<FormField[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({})
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  
  // Статические элементы оформления
  const [staticLayout, setStaticLayout] = useState<{
    heading?: string | null
    subheading?: string | null
    bodyText?: string | null
    disclaimer?: string | null
  }>({})

  useEffect(() => {
    const fetchFields = async () => {
      setContentLoading(true)

      const supabase = createClient()

      // Загружаем статические элементы оформления
      const { data: formData } = await supabase
        .from("forms")
        .select("static_heading, static_subheading, static_body_text, static_disclaimer")
        .eq("id", effectiveFormId)
        .single()

      if (formData) {
        setStaticLayout({
          heading: formData.static_heading,
          subheading: formData.static_subheading,
          bodyText: formData.static_body_text,
          disclaimer: formData.static_disclaimer,
        })
      }

      // Загружаем динамические поля
      const fieldsResult = await getFormFields(effectiveFormId)
      if ("fields" in fieldsResult && fieldsResult.fields.length > 0) {
        setDynamicFields(fieldsResult.fields)
        // Инициализируем значения полей
        const initialValues: Record<string, unknown> = {}
        fieldsResult.fields.forEach((field) => {
          if (field.field_type === "checkbox") {
            initialValues[field.field_key] = false
          } else if (field.field_type === "multiselect" || field.selection_type === "multiple") {
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
        const isMultipleSelection = field.field_type === "multiselect" || field.selection_type === "multiple"
        
        if (field.field_type === "checkbox" && value !== true) {
          return false
        } else if (isMultipleSelection && (!Array.isArray(value) || value.length === 0)) {
          return false
        } else if (field.field_type !== "checkbox" && !isMultipleSelection && !value) {
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
      setError(t("errors.formNotConfigured"))
      return
    }

    // Проверяем обязательные поля
    if (!validateRequiredFields()) {
      setError(t("errors.fillRequiredFields"))
      return
    }

    setIsLoading(true)
    setError(null)

    // URL опционален: если есть поле URL и оно заполнено — используем его
    const urlFields = dynamicFields.filter((f) => f.field_type === "url")
    let formattedUrl = ""
    
    if (urlFields.length > 0) {
      // Если URL-полей несколько — берём первое непустое
      const urlCandidate = urlFields
        .map((f) => ({ field: f, value: String(fieldValues[f.field_key] ?? "").trim() }))
        .find((x) => Boolean(x.value))

      if (urlCandidate) {
        const rawUrl = urlCandidate.value
        formattedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`
        try {
          // Валидируем URL, чтобы не отправлять мусор на сервер
          new URL(formattedUrl)
        } catch {
          setError(t("errors.urlInvalid"))
          setIsLoading(false)
          return
        }
      } else {
        // Если поле URL есть, но не заполнено и обязательно — это уже отловлено в validateRequiredFields
        // Здесь просто оставляем пустой URL
      }
    }

    const supabase = createClient()

    const { data: forms, error: formError } = await supabase
      .from("forms")
      .select("is_active")
      .eq("id", effectiveFormId)
      .limit(1)

    if (formError || !forms || forms.length === 0) {
      setError(t("errors.formNotFound"))
      setIsLoading(false)
      return
    }

    const form = forms[0]

    if (!form.is_active) {
      setError(t("errors.formUnavailable"))
      setIsLoading(false)
      return
    }

    // Захватываем URL родительской страницы (если форма встроена в iframe)
    let parentPageUrl = ""
    try {
      // Проверяем, находимся ли мы во фрейме
      if (window.self !== window.top) {
        // Пытаемся получить URL родительской страницы (работает только если нет CORS ограничений)
        try {
          parentPageUrl = window.parent.location.href
        } catch {
          // Если не получилось из-за CORS, используем referrer
          parentPageUrl = document.referrer || ""
        }
      } else {
        // Если не во фрейме, используем текущий URL
        parentPageUrl = window.location.href
      }
    } catch {
      // На случай любых ошибок
      parentPageUrl = document.referrer || window.location.href
    }

    // Добавляем parent_page_url в кастомные поля
    const extendedFieldValues = {
      ...(dynamicFields.length > 0 ? fieldValues : {}),
      ...(parentPageUrl ? { parent_page_url: parentPageUrl } : {})
    }

    // Передаём URL (или null если нет) и кастомные поля
    onSubmit(formattedUrl || null, extendedFieldValues)
  }

  const isMultipleSelectionField = (field: FormField) =>
    field.field_type === "multiselect" || field.selection_type === "multiple"

  const renderSelectionLabel = (field: FormField) => (
    <Label htmlFor={field.field_key}>
      {field.field_label}
      {field.is_required && <span className="text-destructive ml-1">*</span>}
    </Label>
  )

  const renderImageOptionCards = ({
    field,
    isMultipleSelection,
    selectedValue,
    selectedValues,
  }: {
    field: FormField
    isMultipleSelection: boolean
    selectedValue: string
    selectedValues: string[]
  }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {field.options?.map((option) => {
        const isSelected = isMultipleSelection
          ? selectedValues.includes(option.value)
          : selectedValue === option.value

        const handleClick = () => {
          if (isLoading) return
          if (!isMultipleSelection) {
            handleFieldChange(field.field_key, option.value)
            return
          }
          if (isSelected) {
            handleFieldChange(field.field_key, selectedValues.filter((v) => v !== option.value))
            return
          }
          handleFieldChange(field.field_key, [...selectedValues, option.value])
        }

        return (
          <button
            key={option.value}
            type="button"
            onClick={handleClick}
            disabled={isLoading}
            className={cn(
              "border rounded-lg p-3 transition-colors text-left",
              isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {option.image && (
              <div className="relative w-full aspect-square mb-2 rounded overflow-hidden">
                <img
                  src={option.image}
                  alt={option.label}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              {!isMultipleSelection ? (
                <div
                  className={cn(
                    "h-4 w-4 shrink-0 rounded-full border border-primary flex items-center justify-center transition-colors",
                    isSelected ? "bg-primary" : "bg-background"
                  )}
                >
                  {isSelected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                </div>
              ) : (
                <div
                  className={cn(
                    "h-4 w-4 shrink-0 rounded-none border border-primary flex items-center justify-center transition-colors",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-background"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
              )}
              <span className="text-sm">{option.label}</span>
            </div>
          </button>
        )
      })}
    </div>
  )

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
              type="text"
              value={(value as string) || ""}
              onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
              placeholder={field.placeholder || "example.com"}
              className="h-12 sm:h-14 text-base px-4 sm:px-6 bg-card border-border"
              disabled={isLoading}
            />
          </div>
        )

      case "select":
      case "multiselect":
        const isMultipleSelection = isMultipleSelectionField(field)
        const hasImages = field.options?.some((option) => option.image)
        const selectedValue = (value as string) || ""
        const selectedValues = (value as string[]) || []
        
        if (hasImages)
          return (
            <div key={field.id} className="space-y-2">
              {renderSelectionLabel(field)}
              {renderImageOptionCards({
                field,
                isMultipleSelection,
                selectedValue,
                selectedValues,
              })}
            </div>
          )

        if (!isMultipleSelection)
          return (
            <div key={field.id} className="space-y-2">
              {renderSelectionLabel(field)}
              <Select
                value={selectedValue}
                onValueChange={(val) => handleFieldChange(field.field_key, val)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-12 sm:h-14 text-base px-4 sm:px-6 bg-card border-border">
                  <SelectValue placeholder={t("common.selectPlaceholder")} />
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

        return (
          <div key={field.id} className="space-y-2">
            {renderSelectionLabel(field)}
            <div className="space-y-2 p-4 border rounded-lg bg-card">
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.field_key}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleFieldChange(field.field_key, [...selectedValues, option.value])
                        return
                      }
                      handleFieldChange(field.field_key, selectedValues.filter((v) => v !== option.value))
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
                    {fileNames[field.field_key] || field.placeholder || t("common.selectImage")}
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
          <h1 className="text-2xl font-bold">{t("errors.formNotReady")}</h1>
          <p className="text-muted-foreground">{t("errors.cannotPublishEmptyForm")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-in fade-in duration-500 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        
        {/* Статические элементы оформления */}
        {staticLayout.heading && (
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance text-center">
            {staticLayout.heading}
          </h1>
        )}
        
        {staticLayout.subheading && (
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-balance text-center">
            {staticLayout.subheading}
          </h2>
        )}
        
        {staticLayout.bodyText && (
          <p className="text-base sm:text-lg text-muted-foreground text-balance max-w-xl text-center">
            {staticLayout.bodyText}
          </p>
        )}
        
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
        
        {/* Статический дисклеймер перед кнопкой */}
        {staticLayout.disclaimer && (
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            {staticLayout.disclaimer}
          </p>
        )}
        
        {/* Кнопка отправки формы */}
        <Button type="submit" disabled={isLoading} className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold">
          {isLoading ? t("common.processing") : t("common.continue")}
        </Button>
      </form>
    </div>
  )
}
