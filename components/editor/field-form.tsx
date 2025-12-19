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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Trash2 } from "lucide-react"
import type { FieldType, FormFieldInput, FieldOption } from "@/app/actions/form-fields"

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
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Текст",
  url: "Ссылка",
  select: "Выпадающий список",
  multiselect: "Множественный выбор",
  checkbox: "Чек-бокс",
  image: "Изображение",
  h1: "Заголовок H1",
  h2: "Заголовок H2",
  h3: "Заголовок H3",
  disclaimer: "Дисклеймер",
  submit_button: "Кнопка продолжения",
}

// Типы полей, для которых не нужен placeholder и is_required
const LAYOUT_FIELD_TYPES: FieldType[] = ["h1", "h2", "h3", "disclaimer", "submit_button"]

// Типы полей, для которых нужны опции
const OPTION_FIELD_TYPES: FieldType[] = ["select", "multiselect"]

export function FieldForm({
  open,
  onOpenChange,
  fieldType,
  initialData,
  onSave,
  isLoading,
}: FieldFormProps) {
  const [label, setLabel] = useState(initialData?.field_label || "")
  const [key, setKey] = useState(initialData?.field_key || "")
  const [placeholder, setPlaceholder] = useState(initialData?.placeholder || "")
  const [isRequired, setIsRequired] = useState(initialData?.is_required || false)
  const [options, setOptions] = useState<FieldOption[]>(initialData?.options || [])
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false)

  const isLayoutField = LAYOUT_FIELD_TYPES.includes(fieldType)
  const needsOptions = OPTION_FIELD_TYPES.includes(fieldType)

  // Сбрасываем форму при открытии с новыми данными
  useEffect(() => {
    if (open) {
      setLabel(initialData?.field_label || "")
      setKey(initialData?.field_key || "")
      setPlaceholder(initialData?.placeholder || "")
      setIsRequired(initialData?.is_required || false)
      setOptions(initialData?.options || [])
      setKeyManuallyEdited(!!initialData?.field_key)
    }
  }, [open, initialData])

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
    })
  }

  const isValid = label.trim() && key.trim() && (!needsOptions || options.some(o => o.value && o.label))

  // Определяем label для поля ввода текста в зависимости от типа
  const getLabelText = () => {
    if (fieldType === "submit_button") return "Текст кнопки"
    if (fieldType === "disclaimer") return "Текст дисклеймера"
    if (fieldType === "h1" || fieldType === "h2" || fieldType === "h3") return "Текст заголовка"
    return "Название поля"
  }

  const getPlaceholderText = () => {
    if (fieldType === "submit_button") return "Например: Продолжить"
    if (fieldType === "disclaimer") return "Например: Бесплатно • Занимает 30 секунд"
    if (fieldType === "h1") return "Например: Анализ сайта с помощью ИИ"
    if (fieldType === "h2" || fieldType === "h3") return "Введите текст заголовка"
    return "Например: Ваше имя"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? "Редактировать" : "Новое поле"}: {FIELD_TYPE_LABELS[fieldType]}
          </DialogTitle>
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

          <div className="space-y-2">
            <Label htmlFor="field_key">Ключ поля</Label>
            <Input
              id="field_key"
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setKeyManuallyEdited(true)
              }}
              placeholder="например: your_name"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Уникальный идентификатор поля (автогенерируется из названия)
            </p>
          </div>

          {/* Плейсхолдер - только для полей ввода */}
          {!isLayoutField && (
            <div className="space-y-2">
              <Label htmlFor="field_placeholder">Плейсхолдер</Label>
              <Input
                id="field_placeholder"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Текст-подсказка в поле ввода"
              />
            </div>
          )}

          {/* Обязательность - только для полей ввода */}
          {!isLayoutField && (
            <div className="flex items-center justify-between">
              <Label htmlFor="is_required">Обязательное поле</Label>
              <Switch
                id="is_required"
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
            </div>
          )}

          {needsOptions && (
            <div className="space-y-2">
              <Label>Опции</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option.label}
                      onChange={(e) => handleOptionChange(index, "label", e.target.value)}
                      placeholder="Название"
                      className="flex-1"
                    />
                    <Input
                      value={option.value}
                      onChange={(e) => handleOptionChange(index, "value", e.target.value)}
                      placeholder="Значение"
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
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
                Добавить опцию
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isLoading}>
            {isLoading ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
