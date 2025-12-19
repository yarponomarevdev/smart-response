/**
 * ResultTab - Вкладка "Результат"
 * Содержит поля для отображения результата: заголовок, подзаголовок, текст над формой
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
    <div className="space-y-6 sm:space-y-8 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="result_title" className="text-base sm:text-lg">Заголовок</Label>
        <Input
          id="result_title"
          value={content.result_title || ""}
          onChange={(e) => handleChange("result_title", e.target.value)}
          placeholder="Заголовок"
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="result_subtitle" className="text-base sm:text-lg">Подзаголовок</Label>
        <Input
          id="result_subtitle"
          value={content.result_subtitle || ""}
          onChange={(e) => handleChange("result_subtitle", e.target.value)}
          placeholder="Подзаголовок"
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="result_form_text" className="text-base sm:text-lg">Текст над формой</Label>
        <Input
          id="result_form_text"
          value={content.result_form_text || ""}
          onChange={(e) => handleChange("result_form_text", e.target.value)}
          placeholder="hello.smartresponse.com"
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </div>
    </div>
  )
}
