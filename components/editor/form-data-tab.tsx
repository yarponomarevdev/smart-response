/**
 * FormDataTab - Вкладка "Данные формы"
 * Содержит основные поля: заголовок, подзаголовок, URL placeholder, кнопка отправки, дисклеймер
 */
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useTranslation } from "@/lib/i18n"

interface FormDataTabProps {
  content: Record<string, string>
  onChange: (content: Record<string, string>) => void
}

export function FormDataTab({ content, onChange }: FormDataTabProps) {
  const { t } = useTranslation()
  
  const handleChange = (key: string, value: string) => {
    onChange({ ...content, [key]: value })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <Label htmlFor="page_title" className="text-sm">{t("editor.formDataTab.title")}</Label>
        <Input
          id="page_title"
          value={content.page_title || ""}
          onChange={(e) => handleChange("page_title", e.target.value)}
          placeholder={t("editor.formDataTab.title")}
          className="h-10 sm:h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="page_subtitle" className="text-sm">{t("editor.formDataTab.subtitle")}</Label>
        <Input
          id="page_subtitle"
          value={content.page_subtitle || ""}
          onChange={(e) => handleChange("page_subtitle", e.target.value)}
          placeholder={t("editor.formDataTab.subtitle")}
          className="h-10 sm:h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="submit_button" className="text-sm">{t("editor.formDataTab.submitButton")}</Label>
        <Input
          id="submit_button"
          value={content.submit_button || ""}
          onChange={(e) => handleChange("submit_button", e.target.value)}
          placeholder={t("editor.formDataTab.submitButtonPlaceholder")}
          className="h-10 sm:h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="disclaimer" className="text-sm">{t("editor.formDataTab.disclaimer")}</Label>
        <Input
          id="disclaimer"
          value={content.disclaimer || ""}
          onChange={(e) => handleChange("disclaimer", e.target.value)}
          placeholder={t("editor.formDataTab.disclaimerPlaceholder")}
          className="h-10 sm:h-11"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {t("editor.formDataTab.minOneField")}
      </p>
    </div>
  )
}
