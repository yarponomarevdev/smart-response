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
import { Type, Link, List, ListChecks, CheckSquare, Image, Heading1, Heading2, Heading3, Info } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { useMemo } from "react"
import type { FieldType } from "@/app/actions/form-fields"

interface FieldTypeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: FieldType) => void
}

export function FieldTypeSelector({ open, onOpenChange, onSelect }: FieldTypeSelectorProps) {
  const { t, language } = useTranslation()

  const FIELD_TYPES = useMemo(() => [
    // Элементы оформления
    {
      type: "h1" as FieldType,
      label: t("editor.fieldTypes.h1"),
      icon: <Heading1 className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.h1"),
      category: "layout" as const,
    },
    {
      type: "h2" as FieldType,
      label: t("editor.fieldTypes.h2"),
      icon: <Heading2 className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.h2"),
      category: "layout" as const,
    },
    {
      type: "h3" as FieldType,
      label: t("editor.fieldTypes.h3"),
      icon: <Heading3 className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.h3"),
      category: "layout" as const,
    },
    {
      type: "disclaimer" as FieldType,
      label: t("editor.fieldTypes.disclaimer"),
      icon: <Info className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.disclaimer"),
      category: "layout" as const,
    },
    // Поля ввода
    {
      type: "text" as FieldType,
      label: t("editor.fieldTypes.text"),
      icon: <Type className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.text"),
      category: "input" as const,
    },
    {
      type: "url" as FieldType,
      label: t("editor.fieldTypes.url"),
      icon: <Link className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.url"),
      category: "input" as const,
    },
    {
      type: "select" as FieldType,
      label: t("editor.fieldTypes.select"),
      icon: <List className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.select"),
      category: "input" as const,
    },
    {
      type: "multiselect" as FieldType,
      label: t("editor.fieldTypes.multiselect"),
      icon: <ListChecks className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.multiselect"),
      category: "input" as const,
    },
    {
      type: "checkbox" as FieldType,
      label: t("editor.fieldTypes.checkbox"),
      icon: <CheckSquare className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.checkbox"),
      category: "input" as const,
    },
    {
      type: "image" as FieldType,
      label: t("editor.fieldTypes.image"),
      icon: <Image className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.image"),
      category: "input" as const,
    },
  ], [t, language])

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
          <DialogTitle>{t("editor.fieldTypeSelector.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {/* Элементы оформления */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">{t("editor.fieldTypeSelector.layoutCategory")}</p>
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
            <p className="text-sm text-muted-foreground mb-2">{t("editor.fieldTypeSelector.inputCategory")}</p>
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
