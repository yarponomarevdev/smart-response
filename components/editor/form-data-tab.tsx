/**
 * FormDataTab - Вкладка "Данные формы"
 * Содержит основные поля: заголовок, подзаголовок, URL placeholder, кнопка отправки, дисклеймер
 */
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface FormDataTabProps {
  content: Record<string, string>
  onChange: (content: Record<string, string>) => void
}

export function FormDataTab({ content, onChange }: FormDataTabProps) {
  const handleChange = (key: string, value: string) => {
    onChange({ ...content, [key]: value })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <Label htmlFor="page_title" className="text-sm">Заголовок</Label>
        <Input
          id="page_title"
          value={content.page_title || ""}
          onChange={(e) => handleChange("page_title", e.target.value)}
          placeholder="Заголовок"
          className="h-10 sm:h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="page_subtitle" className="text-sm">Подзаголовок</Label>
        <Input
          id="page_subtitle"
          value={content.page_subtitle || ""}
          onChange={(e) => handleChange("page_subtitle", e.target.value)}
          placeholder="Подзаголовок"
          className="h-10 sm:h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="submit_button" className="text-sm">Текст кнопки отправки</Label>
        <Input
          id="submit_button"
          value={content.submit_button || ""}
          onChange={(e) => handleChange("submit_button", e.target.value)}
          placeholder="Продолжить"
          className="h-10 sm:h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="disclaimer" className="text-sm">Дисклеймер</Label>
        <Input
          id="disclaimer"
          value={content.disclaimer || ""}
          onChange={(e) => handleChange("disclaimer", e.target.value)}
          placeholder="Бесплатно • Занимает 30 секунд"
          className="h-10 sm:h-11"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        *выберите как минимум одно поле
      </p>
    </div>
  )
}
