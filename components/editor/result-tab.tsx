/**
 * ResultTab - Вкладка "Результат"
 * Содержит поля для настройки экрана результата: заголовок, подзаголовок, CTA, кнопки
 */
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ResultTabProps {
  content: Record<string, string>
  onChange: (content: Record<string, string>) => void
}

export function ResultTab({ content, onChange }: ResultTabProps) {
  const handleChange = (key: string, value: string) => {
    onChange({ ...content, [key]: value })
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Основные настройки */}
      <div className="space-y-6 sm:space-y-8 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="result_title" className="text-base sm:text-lg">Заголовок</Label>
          <Input
            id="result_title"
            value={content.result_title || ""}
            onChange={(e) => handleChange("result_title", e.target.value)}
            placeholder="Ваша персональная рекламная кампания готова!"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="result_subtitle" className="text-base sm:text-lg">Подзаголовок</Label>
          <Input
            id="result_subtitle"
            value={content.result_subtitle || ""}
            onChange={(e) => handleChange("result_subtitle", e.target.value)}
            placeholder="А также отправлена на вашу почту"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </div>
      </div>

      {/* CTA блок */}
      <div className="space-y-4 max-w-2xl">
        <h3 className="text-2xl sm:text-3xl font-bold">CTA-блок</h3>
        <p className="text-sm sm:text-base text-muted-foreground italic">
          *отображается на экране результата под контентом
        </p>

        <div className="space-y-2">
          <Label htmlFor="result_cta_text" className="text-base sm:text-lg">СТА-текст</Label>
          <Input
            id="result_cta_text"
            value={content.cta_text || ""}
            onChange={(e) => handleChange("cta_text", e.target.value)}
            placeholder="Подписывайтесь на нас в инстаграм!"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="result_button_text" className="text-base sm:text-lg">Название кнопки</Label>
          <Input
            id="result_button_text"
            value={content.button_text || ""}
            onChange={(e) => handleChange("button_text", e.target.value)}
            placeholder="Перейти в Instagram"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="result_button_url" className="text-base sm:text-lg">Ссылка кнопки</Label>
          <Input
            id="result_button_url"
            value={content.button_url || ""}
            onChange={(e) => handleChange("button_url", e.target.value)}
            placeholder="https://instagram.com/username"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="space-y-4 max-w-2xl">
        <h3 className="text-2xl sm:text-3xl font-bold">Кнопки действий</h3>

        <div className="space-y-2">
          <Label htmlFor="result_download_text" className="text-base sm:text-lg">Текст кнопки "Скачать"</Label>
          <Input
            id="result_download_text"
            value={content.result_download_text || ""}
            onChange={(e) => handleChange("result_download_text", e.target.value)}
            placeholder="Скачать"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="result_share_text" className="text-base sm:text-lg">Текст кнопки "Поделиться"</Label>
          <Input
            id="result_share_text"
            value={content.result_share_text || ""}
            onChange={(e) => handleChange("result_share_text", e.target.value)}
            placeholder="Поделиться"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </div>
      </div>
    </div>
  )
}
