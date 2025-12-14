/**
 * FieldListItem - Элемент списка полей
 * Отображает информацию о поле с кнопками редактирования и удаления
 */
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GripVertical, Pencil, Trash2, Type, Link, List, ListChecks, CheckSquare, Image } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { FormField, FieldType } from "@/app/actions/form-fields"

interface FieldListItemProps {
  id: string
  field: FormField
  onEdit: () => void
  onDelete: () => void
}

const FIELD_TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  url: <Link className="h-4 w-4" />,
  select: <List className="h-4 w-4" />,
  multiselect: <ListChecks className="h-4 w-4" />,
  checkbox: <CheckSquare className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Текст",
  url: "Ссылка",
  select: "Список",
  multiselect: "Множ. выбор",
  checkbox: "Чек-бокс",
  image: "Изображение",
}

export function FieldListItem({
  id,
  field,
  onEdit,
  onDelete,
}: FieldListItemProps) {
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
      className={`flex items-center gap-3 p-3 border rounded-lg bg-background transition-shadow ${
        isDragging ? "shadow-lg opacity-50" : "hover:shadow-sm"
      }`}
    >
      {/* Drag handle */}
      <div
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Icon */}
      <div className="text-muted-foreground">
        {FIELD_TYPE_ICONS[field.field_type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{field.field_label}</span>
          {field.is_required && (
            <Badge variant="secondary" className="text-xs">
              Обязательное
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{field.field_key}</span>
          <span>•</span>
          <span>{FIELD_TYPE_LABELS[field.field_type]}</span>
          {(field.field_type === "select" || field.field_type === "multiselect") && field.options?.length > 0 && (
            <>
              <span>•</span>
              <span>{field.options.length} опций</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
