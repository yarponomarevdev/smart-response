/**
 * FieldTypeSelector - Диалог выбора типа поля
 * Отображает типы полей для формы, включая заголовки и элементы управления
 */
"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Type, Link, List, ListChecks, CheckSquare, Image, Heading1, Heading2, Heading3, Info, ArrowRight } from "lucide-react"
import type { FieldType } from "@/app/actions/form-fields"

interface FieldTypeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: FieldType) => void
}

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ReactNode; description: string; category: "layout" | "input" }[] = [
  // Элементы оформления
  {
    type: "h1",
    label: "Заголовок H1",
    icon: <Heading1 className="h-5 w-5" />,
    description: "Крупный заголовок",
    category: "layout",
  },
  {
    type: "h2",
    label: "Заголовок H2",
    icon: <Heading2 className="h-5 w-5" />,
    description: "Средний заголовок",
    category: "layout",
  },
  {
    type: "h3",
    label: "Заголовок H3",
    icon: <Heading3 className="h-5 w-5" />,
    description: "Малый заголовок",
    category: "layout",
  },
  {
    type: "disclaimer",
    label: "Дисклеймер",
    icon: <Info className="h-5 w-5" />,
    description: "Мелкий текст примечания",
    category: "layout",
  },
  {
    type: "submit_button",
    label: "Кнопка продолжения",
    icon: <ArrowRight className="h-5 w-5" />,
    description: "Кнопка перехода к следующему шагу",
    category: "layout",
  },
  // Поля ввода
  {
    type: "text",
    label: "Текст",
    icon: <Type className="h-5 w-5" />,
    description: "Однострочное текстовое поле",
    category: "input",
  },
  {
    type: "url",
    label: "Ссылка",
    icon: <Link className="h-5 w-5" />,
    description: "Поле для ввода URL",
    category: "input",
  },
  {
    type: "select",
    label: "Выпадающий список (один выбор)",
    icon: <List className="h-5 w-5" />,
    description: "Выбор одного значения из списка",
    category: "input",
  },
  {
    type: "multiselect",
    label: "Выпадающий список (множ. выбор)",
    icon: <ListChecks className="h-5 w-5" />,
    description: "Выбор нескольких значений из списка",
    category: "input",
  },
  {
    type: "checkbox",
    label: "Чек-бокс с текстом",
    icon: <CheckSquare className="h-5 w-5" />,
    description: "Галочка с текстовой подписью",
    category: "input",
  },
  {
    type: "image",
    label: "Изображение (jpeg, png)",
    icon: <Image className="h-5 w-5" />,
    description: "Загрузка изображения",
    category: "input",
  },
]

export function FieldTypeSelector({ open, onOpenChange, onSelect }: FieldTypeSelectorProps) {
  const handleSelect = (type: FieldType) => {
    onSelect(type)
    onOpenChange(false)
  }

  const layoutFields = FIELD_TYPES.filter(f => f.category === "layout")
  const inputFields = FIELD_TYPES.filter(f => f.category === "input")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Выберите тип поля:</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {/* Элементы оформления */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Элементы оформления</p>
            <div className="space-y-1">
              {layoutFields.map((fieldType) => (
                <Button
                  key={fieldType.type}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 px-4 hover:bg-accent"
                  onClick={() => handleSelect(fieldType.type)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">{fieldType.icon}</div>
                    <div className="text-left">
                      <div className="font-medium">{fieldType.label}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
          
          {/* Поля ввода */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Поля ввода</p>
            <div className="space-y-1">
              {inputFields.map((fieldType) => (
                <Button
                  key={fieldType.type}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 px-4 hover:bg-accent"
                  onClick={() => handleSelect(fieldType.type)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">{fieldType.icon}</div>
                    <div className="text-left">
                      <div className="font-medium">{fieldType.label}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { FIELD_TYPES }
