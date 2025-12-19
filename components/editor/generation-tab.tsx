/**
 * GenerationTab - Вкладка "Генерация"
 * Содержит настройки AI: системный промпт, формат результата, сообщения загрузки
 */
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface GenerationTabProps {
  content: Record<string, string>
  systemPrompt: string
  resultFormat: string
  loadingMessages: string[]
  onContentChange: (content: Record<string, string>) => void
  onSystemPromptChange: (value: string) => void
  onResultFormatChange: (value: string) => void
  onLoadingMessageChange: (index: number, value: string) => void
}

export function GenerationTab({
  content,
  systemPrompt,
  onContentChange,
  loadingMessages,
  onLoadingMessageChange,
}: GenerationTabProps) {
  const handleChange = (key: string, value: string) => {
    onContentChange({ ...content, [key]: value })
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-8 sm:space-y-10 max-w-2xl">
        {/* Заголовок */}
        <div className="space-y-2">
          <Label htmlFor="gen_title" className="text-base sm:text-lg">Заголовок</Label>
          <Input
            id="gen_title"
            value={content.gen_title || ""}
            onChange={(e) => handleChange("gen_title", e.target.value)}
            placeholder="Заголовок"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </div>

        {/* Подзаголовок */}
        <div className="space-y-2">
          <Label htmlFor="gen_subtitle" className="text-base sm:text-lg">Подзаголовок</Label>
          <Input
            id="gen_subtitle"
            value={content.gen_subtitle || ""}
            onChange={(e) => handleChange("gen_subtitle", e.target.value)}
            placeholder="Подзаголовок"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </div>

        {/* Текст над формой */}
        <div className="space-y-2">
          <Label htmlFor="gen_description" className="text-base sm:text-lg">Текст над формой</Label>
          <Input
            id="gen_description"
            value={content.gen_description || ""}
            onChange={(e) => handleChange("gen_description", e.target.value)}
            placeholder="hello.smartresponse.com"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </div>
      </div>

      {/* Генерация ответа - ВЫНЕСЛИ ИЗ max-w-2xl */}
      <div className="space-y-4">
        <h3 className="text-2xl sm:text-3xl font-bold">Генерация ответа</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="system_prompt" className="text-base sm:text-lg">
              Напишите промпт или опишите идею для генерации ответа:
            </Label>
            <Button
              variant="default"
              className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[30px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 text-sm sm:text-base"
            >
              Улучшить с AI
            </Button>
          </div>
          <Textarea
            id="system_prompt"
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="Плейсхолдер"
            rows={6}
            className="h-[150px] sm:h-[242px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6 py-4 resize-none"
          />
        </div>
      </div>

      {/* Процесс генерации */}
      <div className="space-y-4">
        <div className="max-w-2xl">
          <h3 className="text-2xl sm:text-3xl font-bold">Процесс генерации</h3>
          <p className="text-sm sm:text-base text-muted-foreground italic">
            *текст появляется в виде слайд-шоу во время генерации ответа
          </p>
        </div>

        {/* Три поля в ряд */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`loading_${index}`} className="text-base sm:text-lg">
                Поле {index + 1}
              </Label>
              <Input
                id={`loading_${index}`}
                value={loadingMessages[index] || ""}
                onChange={(e) => onLoadingMessageChange(index, e.target.value)}
                placeholder={index === 0 ? "Просто" : index === 1 ? "Вкусно" : "Быстро"}
                className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
              />
            </div>
          ))}
        </div>

        <div className="space-y-4 max-w-2xl">
          {/* СТА-текст */}
          <div className="space-y-2">
            <Label htmlFor="cta_text" className="text-base sm:text-lg">СТА-текст</Label>
            <Input
              id="cta_text"
              value={content.cta_text || ""}
              onChange={(e) => handleChange("cta_text", e.target.value)}
              placeholder="Покупай"
              className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
            />
          </div>

          {/* Название кнопки */}
          <div className="space-y-2">
            <Label htmlFor="button_text" className="text-base sm:text-lg">Название кнопки</Label>
            <Input
              id="button_text"
              value={content.button_text || ""}
              onChange={(e) => handleChange("button_text", e.target.value)}
              placeholder="Подписаться в Instagram*"
              className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
            />
          </div>

          {/* Ссылка кнопки */}
          <div className="space-y-2">
            <Label htmlFor="button_url" className="text-base sm:text-lg">Ссылка кнопки</Label>
            <Input
              id="button_url"
              value={content.button_url || ""}
              onChange={(e) => handleChange("button_url", e.target.value)}
              placeholder="https://instagram.com/username"
              className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
            />
          </div>
        </div>
      </div>

      {/* Доп. настройки */}
      <div className="space-y-4 max-w-2xl">
        <h3 className="text-2xl sm:text-3xl font-bold">Доп. настройки</h3>

        {/* Чекбокс базы знаний */}
        <div className="flex items-center gap-3 pt-2">
          <Checkbox
            id="use_knowledge_base"
            className="h-6 w-6 rounded-[5px]"
          />
          <Label htmlFor="use_knowledge_base" className="text-base sm:text-lg cursor-pointer">
            Использовать базу знаний
          </Label>
        </div>

        {/* База знаний / Другие данные */}
        <div className="space-y-2">
          <Label className="text-base sm:text-lg">База знаний / Другие данные</Label>
          <Button
            variant="default"
            className="w-full h-14 rounded-[18px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 text-base sm:text-lg"
          >
            Загрузить файл
          </Button>
          <div className="space-y-1 pt-2">
            <p className="text-sm sm:text-base text-muted-foreground italic">Файл_1</p>
            <p className="text-sm sm:text-base text-muted-foreground italic">Файл_2</p>
            <p className="text-sm sm:text-base text-muted-foreground italic">Файл_3</p>
          </div>
        </div>

        {/* Ссылка */}
        <div className="space-y-2">
          <Label htmlFor="knowledge_url" className="text-base sm:text-lg">Ссылка</Label>
          <Input
            id="knowledge_url"
            value={content.knowledge_url || ""}
            onChange={(e) => handleChange("knowledge_url", e.target.value)}
            placeholder="Плейсхолдер"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </div>
      </div>
    </div>
  )
}
