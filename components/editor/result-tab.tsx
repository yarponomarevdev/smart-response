/**
 * ResultTab - Вкладка "Результат"
 * Содержит поля для настройки экрана результата: заголовок, подзаголовок, CTA, кнопки
 * С автосохранением каждого поля
 */
"use client"

import { Input } from "@/components/ui/input"
import { AutoSaveFieldWrapper } from "@/components/ui/auto-save-input"
import { useAutoSaveField } from "@/lib/hooks/use-autosave"

interface ResultTabProps {
  formId: string | null
  content: Record<string, string>
}

export function ResultTab({ formId, content }: ResultTabProps) {
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

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* CTA блок */}
      <div className="space-y-4 max-w-2xl">
        <h3 className="text-2xl sm:text-3xl font-bold">CTA-блок</h3>
        <p className="text-sm sm:text-base text-muted-foreground italic">
          *отображается на экране результата под контентом
        </p>

        <AutoSaveFieldWrapper
          label="СТА-текст"
          labelFor="result_cta_text"
          status={ctaText.status}
        >
          <Input
            id="result_cta_text"
            value={ctaText.value}
            onChange={(e) => ctaText.onChange(e.target.value)}
            placeholder="Подписывайтесь на нас в инстаграм!"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </AutoSaveFieldWrapper>

        <AutoSaveFieldWrapper
          label="Название кнопки"
          labelFor="result_button_text"
          status={buttonText.status}
        >
          <Input
            id="result_button_text"
            value={buttonText.value}
            onChange={(e) => buttonText.onChange(e.target.value)}
            placeholder="Перейти в Instagram"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </AutoSaveFieldWrapper>

        <AutoSaveFieldWrapper
          label="Ссылка кнопки"
          labelFor="result_button_url"
          status={buttonUrl.status}
        >
          <Input
            id="result_button_url"
            value={buttonUrl.value}
            onChange={(e) => buttonUrl.onChange(e.target.value)}
            placeholder="https://instagram.com/username"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </AutoSaveFieldWrapper>
      </div>
    </div>
  )
}
