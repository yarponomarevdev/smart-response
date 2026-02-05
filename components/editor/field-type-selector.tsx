/**
 * FieldTypeSelector - Диалог выбора типа поля
 * Отображает типы полей для формы, включая заголовки и элементы управления
 */
"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Type, Link, List, ListChecks, CheckSquare, Image } from "lucide-react"
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
    // Поля ввода
    {
      type: "text" as FieldType,
      label: t("editor.fieldTypes.text"),
      icon: <Type className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.text"),
    },
    {
      type: "url" as FieldType,
      label: t("editor.fieldTypes.url"),
      icon: <Link className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.url"),
    },
    {
      type: "select" as FieldType,
      label: t("editor.fieldTypes.select"),
      icon: <List className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.select"),
    },
    {
      type: "multiselect" as FieldType,
      label: t("editor.fieldTypes.multiselect"),
      icon: <ListChecks className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.multiselect"),
    },
    {
      type: "checkbox" as FieldType,
      label: t("editor.fieldTypes.checkbox"),
      icon: <CheckSquare className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.checkbox"),
    },
    {
      type: "image" as FieldType,
      label: t("editor.fieldTypes.image"),
      icon: <Image className="h-5 w-5" />,
      description: t("editor.fieldTypesDescriptions.image"),
    },
  ], [t, language])

  const handleSelect = (type: FieldType) => {
    onSelect(type)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editor.fieldTypeSelector.title")}</DialogTitle>
          <DialogDescription>
            {t("editor.fieldTypeSelector.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-4">
          {FIELD_TYPES.map((fieldType) => (
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
      </DialogContent>
    </Dialog>
  )
}
