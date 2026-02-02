/**
 * StaticLayoutFields - Компонент для редактирования статичных элементов оформления формы
 * Включает: Заголовок (H1), Подзаголовок (H2), Текст (параграф), Дисклеймер
 * Все поля необязательны для заполнения и автоматически сохраняются
 */
"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AutoSaveFieldWrapper } from "@/components/ui/auto-save-input"
import { useAutoSaveField } from "@/lib/hooks/use-autosave"
import { useTranslation } from "@/lib/i18n"
import { LayoutTemplate } from "lucide-react"

interface StaticLayoutFieldsProps {
  formId: string | null
  initialData?: {
    static_heading?: string | null
    static_subheading?: string | null
    static_body_text?: string | null
    static_disclaimer?: string | null
  }
}

export function StaticLayoutFields({ formId, initialData }: StaticLayoutFieldsProps) {
  const { t } = useTranslation()

  // Автосохраняемые поля
  const heading = useAutoSaveField({
    formId,
    fieldKey: "static_heading",
    initialValue: initialData?.static_heading || "",
  })

  const subheading = useAutoSaveField({
    formId,
    fieldKey: "static_subheading",
    initialValue: initialData?.static_subheading || "",
  })

  const bodyText = useAutoSaveField({
    formId,
    fieldKey: "static_body_text",
    initialValue: initialData?.static_body_text || "",
  })

  const disclaimer = useAutoSaveField({
    formId,
    fieldKey: "static_disclaimer",
    initialValue: initialData?.static_disclaimer || "",
  })

  if (!formId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("editor.staticLayoutFields.selectForm")}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5" />
          {t("editor.staticLayoutFields.title")}
          <span className="text-muted-foreground text-sm font-normal ml-1">
            {t("editor.staticLayoutFields.optional")}
          </span>
        </CardTitle>
        <CardDescription>
          {t("editor.staticLayoutFields.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Заголовок (H1) */}
        <AutoSaveFieldWrapper
          label={t("editor.staticLayoutFields.heading")}
          labelFor="static_heading"
          status={heading.status}
        >
          <Input
            id="static_heading"
            value={heading.value}
            onChange={(e) => heading.onChange(e.target.value)}
            placeholder={t("editor.staticLayoutFields.headingPlaceholder")}
            className="text-lg"
          />
        </AutoSaveFieldWrapper>

        {/* Подзаголовок (H2) */}
        <AutoSaveFieldWrapper
          label={t("editor.staticLayoutFields.subheading")}
          labelFor="static_subheading"
          status={subheading.status}
        >
          <Input
            id="static_subheading"
            value={subheading.value}
            onChange={(e) => subheading.onChange(e.target.value)}
            placeholder={t("editor.staticLayoutFields.subheadingPlaceholder")}
          />
        </AutoSaveFieldWrapper>

        {/* Текст (параграф) */}
        <AutoSaveFieldWrapper
          label={t("editor.staticLayoutFields.bodyText")}
          labelFor="static_body_text"
          status={bodyText.status}
        >
          <Textarea
            id="static_body_text"
            value={bodyText.value}
            onChange={(e) => bodyText.onChange(e.target.value)}
            placeholder={t("editor.staticLayoutFields.bodyTextPlaceholder")}
            rows={3}
          />
        </AutoSaveFieldWrapper>

        {/* Дисклеймер */}
        <AutoSaveFieldWrapper
          label={t("editor.staticLayoutFields.disclaimer")}
          labelFor="static_disclaimer"
          status={disclaimer.status}
        >
          <Textarea
            id="static_disclaimer"
            value={disclaimer.value}
            onChange={(e) => disclaimer.onChange(e.target.value)}
            placeholder={t("editor.staticLayoutFields.disclaimerPlaceholder")}
            rows={2}
          />
        </AutoSaveFieldWrapper>
      </CardContent>
    </Card>
  )
}
