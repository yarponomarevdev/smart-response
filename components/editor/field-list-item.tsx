/**
 * FieldListItem - Элемент списка полей
 * Отображает информацию о поле с кнопками редактирования и удаления
 */
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InlineEditableText } from "@/components/ui/inline-editable-text"
import { GripVertical, Pencil, Trash2, Type, Link, List, ListChecks, CheckSquare, Image, Heading1, Heading2, Heading3, Info, Asterisk } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { FormField, FieldType } from "@/app/actions/form-fields"
import { useTranslation } from "@/lib/i18n"

interface FieldListItemProps {
  id: string
  field: FormField
  onEdit: () => void
  onDelete: () => void
  onFieldUpdate?: (fieldId: string, updates: Partial<Pick<FormField, "field_label" | "placeholder">>) => Promise<void>
}

const FIELD_TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  url: <Link className="h-4 w-4" />,
  select: <List className="h-4 w-4" />,
  multiselect: <ListChecks className="h-4 w-4" />,
  checkbox: <CheckSquare className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  h1: <Heading1 className="h-4 w-4" />,
  h2: <Heading2 className="h-4 w-4" />,
  h3: <Heading3 className="h-4 w-4" />,
  disclaimer: <Info className="h-4 w-4" />,
}


// Типы полей, для которых не нужен placeholder
const LAYOUT_FIELD_TYPES: FieldType[] = ["h1", "h2", "h3", "disclaimer"]

export function FieldListItem({
  id,
  field,
  onEdit,
  onDelete,
  onFieldUpdate,
}: FieldListItemProps) {
  const { t } = useTranslation()
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border border-[#f4f4f4] dark:border-muted transition-shadow ${
        isDragging ? "shadow-lg opacity-50" : "hover:shadow-sm"
      }`}
    >
      {/* Drag handle */}
      <div
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0 touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Icon */}
      <div className="text-muted-foreground flex-shrink-0">
        {FIELD_TYPE_ICONS[field.field_type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {onFieldUpdate ? (
            <InlineEditableText
              value={field.field_label}
              onSave={async (newValue) => {
                await onFieldUpdate(field.id, { field_label: newValue })
              }}
              placeholder={t("editor.fieldForm.fieldNameLabel")}
              className="font-medium text-base sm:text-lg flex-1 min-w-0"
            />
          ) : (
            <span className="font-medium block min-w-0 truncate text-base sm:text-lg">{field.field_label}</span>
          )}
          {field.is_required && (
            <Badge variant="secondary" className="text-xs flex-shrink-0 px-1.5 sm:px-2.5">
              <span className="sm:hidden">
                <Asterisk className="h-3 w-3" />
              </span>
              <span className="hidden sm:inline">{t("editor.fieldForm.requiredField")}</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
          {/* Placeholder только для input полей */}
          {!LAYOUT_FIELD_TYPES.includes(field.field_type) && (
            <>
              {onFieldUpdate ? (
                <InlineEditableText
                  value={field.placeholder || ""}
                  onSave={async (newValue) => {
                    await onFieldUpdate(field.id, { placeholder: newValue || null })
                  }}
                  placeholder={t("editor.fieldForm.placeholderLabel")}
                  emptyText={t("editor.fieldForm.emptyPlaceholder")}
                  className="text-xs sm:text-sm flex-1 min-w-0"
                />
              ) : (
                field.placeholder && <span className="block min-w-0 truncate">{field.placeholder}</span>
              )}
              <span>•</span>
            </>
          )}
          <span>{t(`editor.fieldTypesShort.${field.field_type}` as const)}</span>
          {(field.field_type === "select" || field.field_type === "multiselect") && field.options?.length > 0 && (
            <>
              <span>•</span>
              <span>{field.options.length} {t("editor.fieldForm.optionsLabel").toLowerCase()}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
