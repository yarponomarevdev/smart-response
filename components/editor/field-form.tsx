/**
 * FieldForm - Форма редактирования поля
 * Позволяет настраивать название, ключ, обязательность и опции для select
 * Адаптируется для разных типов полей (включая заголовки, дисклеймер, кнопку)
 */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Trash2, Settings, ChevronDown, ImagePlus, Loader2, X } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { FieldType, FormFieldInput, FieldOption } from "@/app/actions/form-fields"
import { uploadOptionImage, deleteOptionImage } from "@/app/actions/storage"
import { toast } from "sonner"
import Image from "next/image"

/**
 * Генерирует уникальный ключ поля из названия (клиентская версия)
 */
function generateFieldKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, "")
    .replace(/\s+/g, "_")
    .substring(0, 50)
}

interface FieldFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fieldType: FieldType
  initialData?: FormFieldInput
  onSave: (data: FormFieldInput) => void
  isLoading?: boolean
  formId?: string  // Нужен для загрузки картинок опций
}


// Типы полей, для которых не нужен placeholder и is_required
const LAYOUT_FIELD_TYPES: FieldType[] = ["h1", "h2", "h3", "disclaimer"]

// Типы полей, для которых нужны опции
const OPTION_FIELD_TYPES: FieldType[] = ["select", "multiselect"]

// Типы полей, для которых не нужен placeholder (select/multiselect используют выбор из списка)
const NO_PLACEHOLDER_FIELD_TYPES: FieldType[] = ["h1", "h2", "h3", "disclaimer", "select", "multiselect"]

export function FieldForm({
  open,
  onOpenChange,
  fieldType,
  initialData,
  onSave,
  isLoading,
  formId,
}: FieldFormProps) {
  const { t, language } = useTranslation()
  const [label, setLabel] = useState(initialData?.field_label || "")
  const [key, setKey] = useState(initialData?.field_key || "")
  const [placeholder, setPlaceholder] = useState(initialData?.placeholder || "")
  const [isRequired, setIsRequired] = useState(initialData?.is_required ?? false)
  const [options, setOptions] = useState<FieldOption[]>(initialData?.options || [])
  const [selectionType, setSelectionType] = useState<'single' | 'multiple'>(initialData?.selection_type || 'single')
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  const isLayoutField = LAYOUT_FIELD_TYPES.includes(fieldType)
  const needsOptions = OPTION_FIELD_TYPES.includes(fieldType)

  const FIELD_TYPE_LABELS = useMemo(() => ({
    text: t("editor.fieldTypes.text"),
    url: t("editor.fieldTypes.url"),
    select: t("editor.fieldTypes.select"),
    multiselect: t("editor.fieldTypes.multiselect"),
    checkbox: t("editor.fieldTypes.checkbox"),
    image: t("editor.fieldTypes.image"),
    h1: t("editor.fieldTypes.h1"),
    h2: t("editor.fieldTypes.h2"),
    h3: t("editor.fieldTypes.h3"),
    disclaimer: t("editor.fieldTypes.disclaimer"),
  }), [t, language])

  // Сбрасываем форму только при открытии диалога (не при обновлении initialData)
  useEffect(() => {
    if (open) {
      setLabel(initialData?.field_label || "")
      setKey(initialData?.field_key || "")
      setPlaceholder(initialData?.placeholder || "")
      setIsRequired(initialData?.is_required ?? false)
      setOptions(initialData?.options || [])
      setSelectionType(initialData?.selection_type || 'single')
      setKeyManuallyEdited(!!initialData?.field_key)
    }
  }, [open])

  // Автогенерация ключа из названия
  useEffect(() => {
    if (!keyManuallyEdited && label) {
      setKey(generateFieldKey(label))
    }
  }, [label, keyManuallyEdited])

  const handleAddOption = () => {
    setOptions([...options, { value: "", label: "" }])
  }

  const handleOptionChange = (index: number, field: "value" | "label", value: string) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    // Автогенерация value из label если value пустой
    if (field === "label" && !newOptions[index].value) {
      newOptions[index].value = generateFieldKey(value)
    }
    setOptions(newOptions)
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  // Загрузка картинки для опции (только для multiselect)
  const handleOptionImageUpload = async (index: number, file: File) => {
    if (!formId) {
      toast.error("ID формы не указан")
      return
    }

    setUploadingIndex(index)
    try {
      const result = await uploadOptionImage(formId, file)
      if ("error" in result) {
        toast.error(result.error)
        return
      }

      const newOptions = [...options]
      newOptions[index] = { ...newOptions[index], image: result.url }
      setOptions(newOptions)
    } catch (error) {
      toast.error("Ошибка загрузки изображения")
    } finally {
      setUploadingIndex(null)
    }
  }

  // Удаление картинки опции
  const handleRemoveOptionImage = async (index: number) => {
    const option = options[index]
    if (!option.image) return

    try {
      await deleteOptionImage(option.image)
    } catch {
      // Игнорируем ошибку удаления из Storage, всё равно убираем из state
    }

    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], image: undefined }
    setOptions(newOptions)
  }

  const handleSave = () => {
    if (!label.trim() || !key.trim()) return
    if (needsOptions && options.length === 0) return

    onSave({
      id: initialData?.id,
      field_type: fieldType,
      field_label: label.trim(),
      field_key: key.trim(),
      placeholder: isLayoutField ? undefined : (placeholder.trim() || undefined),
      is_required: isLayoutField ? false : isRequired,
      options: needsOptions ? options.filter(o => o.value && o.label) : [],
      selection_type: needsOptions ? selectionType : undefined,
    })
  }

  const isValid = label.trim() && key.trim() && (!needsOptions || options.some(o => o.value && o.label))

  // Определяем label для поля ввода текста в зависимости от типа
  const getLabelText = () => {
    if (fieldType === "disclaimer") return t("editor.fieldForm.disclaimerLabel")
    if (fieldType === "h1" || fieldType === "h2" || fieldType === "h3") return t("editor.fieldForm.headingLabel")
    return t("editor.fieldForm.fieldNameLabel")
  }

  const getPlaceholderText = () => {
    if (fieldType === "disclaimer") return t("editor.fieldForm.disclaimerPlaceholder")
    if (fieldType === "h1") return t("editor.fieldForm.h1Placeholder")
    if (fieldType === "h2" || fieldType === "h3") return t("editor.fieldForm.h2Placeholder")
    return t("editor.fieldForm.fieldPlaceholder")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? t("editor.fieldForm.editField") : t("editor.fieldForm.newField")}: {FIELD_TYPE_LABELS[fieldType]}
          </DialogTitle>
          <DialogDescription>
            {initialData?.id ? t("editor.fieldForm.editFieldDescription") : t("editor.fieldForm.newFieldDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="field_label">{getLabelText()}</Label>
            <Input
              id="field_label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={getPlaceholderText()}
            />
          </div>

          {/* Расширенные настройки (ключ поля) */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4 mr-2" />
              {t("editor.fieldForm.advancedSettings")}
              <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", showAdvanced && "rotate-180")} />
            </Button>

            {showAdvanced && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="field_key">{t("editor.fieldForm.fieldIdLabel")}</Label>
                <Input
                  id="field_key"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value)
                    setKeyManuallyEdited(true)
                  }}
                  placeholder={t("editor.fieldForm.fieldIdPlaceholder")}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t("editor.fieldForm.fieldIdDescription")}
                </p>
              </div>
            )}
          </div>

          {/* Плейсхолдер - только для полей ввода (не для select/multiselect) */}
          {!NO_PLACEHOLDER_FIELD_TYPES.includes(fieldType) && (
            <div className="space-y-2">
              <Label htmlFor="field_placeholder">{t("editor.fieldForm.placeholderLabel")}</Label>
              <Input
                id="field_placeholder"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder={t("editor.fieldForm.placeholderPlaceholder")}
              />
            </div>
          )}

          {/* Обязательность - только для полей ввода */}
          {!isLayoutField && (
            <div className="flex items-center justify-between">
              <Label htmlFor="is_required">{t("editor.fieldForm.requiredField")}</Label>
              <Switch
                id="is_required"
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
            </div>
          )}

          {/* Тип выбора - только для полей с опциями */}
          {needsOptions && (
            <div className="space-y-2">
              <Label>{t("editor.fieldForm.selectionTypeLabel")}</Label>
              <RadioGroup value={selectionType} onValueChange={(value: 'single' | 'multiple') => setSelectionType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="font-normal cursor-pointer">
                    {t("editor.fieldForm.selectionTypeSingle")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple" id="multiple" />
                  <Label htmlFor="multiple" className="font-normal cursor-pointer">
                    {t("editor.fieldForm.selectionTypeMultiple")}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {needsOptions && (
            <div className="space-y-2">
              <Label>{t("editor.fieldForm.optionsLabel")}</Label>
              
              {/* Режим с картинками для обоих типов */}
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    {/* Картинка */}
                    <div className="w-16 h-16 border rounded overflow-hidden flex-shrink-0 relative group">
                      {option.image ? (
                        <>
                          <Image
                            src={option.image}
                            alt={option.label || "Option image"}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionImage(index)}
                            className="absolute top-0 right-0 p-0.5 bg-destructive text-destructive-foreground rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : uploadingIndex === index ? (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                          <ImagePlus className="h-5 w-5 text-muted-foreground" />
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleOptionImageUpload(index, file)
                              e.target.value = ""
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {/* Название и ключ */}
                    <div className="flex-1 space-y-1">
                      <Input
                        value={option.label}
                        onChange={(e) => handleOptionChange(index, "label", e.target.value)}
                        placeholder={t("editor.fieldForm.optionName")}
                      />
                      <Input
                        value={option.value}
                        onChange={(e) => handleOptionChange(index, "value", e.target.value)}
                        placeholder={t("editor.fieldForm.optionKey")}
                        className="font-mono text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      className="self-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("editor.fieldForm.addOption")}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("editor.fieldForm.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isLoading}>
            {isLoading ? t("editor.fieldForm.saving") : t("editor.fieldForm.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
