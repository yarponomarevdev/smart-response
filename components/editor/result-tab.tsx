/**
 * ResultTab - Вкладка "Результат"
 * Содержит поля для отображения результата: заголовок, текст блюра
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
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="result_title" className="text-sm">Заголовок результата</Label>
        <Input
          id="result_title"
          value={content.result_title || ""}
          onChange={(e) => handleChange("result_title", e.target.value)}
          placeholder="Ваш результат"
          className="h-10 sm:h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="result_blur_text" className="text-sm">Текст блюра результата (до ввода email)</Label>
        <Input
          id="result_blur_text"
          value={content.result_blur_text || ""}
          onChange={(e) => handleChange("result_blur_text", e.target.value)}
          placeholder="Введите email чтобы увидеть полный результат"
          className="h-10 sm:h-11"
        />
      </div>
    </div>
  )
}
