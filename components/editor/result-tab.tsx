/**
 * ResultTab - Вкладка "Результат"
 * Содержит поля для настройки экрана результата: заголовок, подзаголовок, CTA, кнопки
 * С автосохранением каждого поля
 */
"use client"

import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AutoSaveFieldWrapper } from "@/components/ui/auto-save-input"
import { useAutoSaveField } from "@/lib/hooks/use-autosave"
import { useTranslation } from "@/lib/i18n"
import { Trophy } from "lucide-react"

interface ResultTabProps {
  formId: string | null
  content: Record<string, string>
}

export function ResultTab({ formId, content }: ResultTabProps) {
  const { t } = useTranslation()
  
  // Автосохранение полей CTA
  const ctaText = useAutoSaveField({
    formId,
    fieldKey: "cta_text",
    initialValue: content.cta_text || "",
  })

  const buttonText = useAutoSaveField({
    formId,
    fieldKey: "button_text",
    initialValue: content.button_text || "",
  })

  const buttonUrl = useAutoSaveField({
    formId,
    fieldKey: "button_url",
    initialValue: content.button_url || "",
  })

  // Валидация и нормализация URL
  const handleButtonUrlBlur = () => {
    const url = buttonUrl.value.trim()
    if (!url) return
    
    // Если URL не начинается с http:// или https://, добавляем https://
    if (!url.match(/^https?:\/\//i)) {
      buttonUrl.onChange(`https://${url}`)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mr-auto pb-10">
      {/* CTA блок */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {t("editor.resultTab.ctaBlock")}
          </CardTitle>
          <CardDescription>
            {t("editor.resultTab.ctaHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AutoSaveFieldWrapper
            label={t("editor.resultTab.ctaText")}
            labelFor="result_cta_text"
            status={ctaText.status}
          >
            <Input
              id="result_cta_text"
              value={ctaText.value}
              onChange={(e) => ctaText.onChange(e.target.value)}
              placeholder={t("editor.resultTab.ctaTextPlaceholder")}
              className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
            />
          </AutoSaveFieldWrapper>

          <AutoSaveFieldWrapper
            label={t("editor.resultTab.buttonName")}
            labelFor="result_button_text"
            status={buttonText.status}
          >
            <Input
              id="result_button_text"
              value={buttonText.value}
              onChange={(e) => buttonText.onChange(e.target.value)}
              placeholder={t("editor.resultTab.buttonNamePlaceholder")}
              className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
            />
          </AutoSaveFieldWrapper>

          <AutoSaveFieldWrapper
            label={t("editor.resultTab.buttonLink")}
            labelFor="result_button_url"
            status={buttonUrl.status}
          >
            <Input
              id="result_button_url"
              type="url"
              value={buttonUrl.value}
              onChange={(e) => buttonUrl.onChange(e.target.value)}
              onBlur={handleButtonUrlBlur}
              placeholder={t("editor.resultTab.buttonLinkPlaceholder")}
              className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
            />
          </AutoSaveFieldWrapper>
        </CardContent>
      </Card>
    </div>
  )
}
