/**
 * GenerationTab - Вкладка "Генерация"
 * Содержит настройки AI: системный промпт, формат результата, сообщения загрузки
 * С автосохранением каждого поля
 */
"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AutoSaveFieldWrapper, SaveStatusIndicator } from "@/components/ui/auto-save-input"
import { useAutoSaveField } from "@/lib/hooks/use-autosave"
import { Loader2, Sparkles } from "lucide-react"

interface GenerationTabProps {
  formId: string | null
  systemPrompt: string
  loadingMessages: string[]
  content: Record<string, string>
}

export function GenerationTab({
  formId,
  systemPrompt: initialSystemPrompt,
  loadingMessages: initialLoadingMessages,
  content,
}: GenerationTabProps) {
  // Автосохранение системного промпта
  const systemPrompt = useAutoSaveField({
    formId,
    fieldKey: "ai_system_prompt",
    initialValue: initialSystemPrompt,
    debounceMs: 800, // Чуть больше debounce для большого текста
  })

  // Автосохранение loading messages
  const loadingMessage1 = useAutoSaveField({
    formId,
    fieldKey: "loading_message_1",
    initialValue: initialLoadingMessages[0] || "",
  })

  const loadingMessage2 = useAutoSaveField({
    formId,
    fieldKey: "loading_message_2",
    initialValue: initialLoadingMessages[1] || "",
  })

  const loadingMessage3 = useAutoSaveField({
    formId,
    fieldKey: "loading_message_3",
    initialValue: initialLoadingMessages[2] || "",
  })

  // Автосохранение ссылки на базу знаний
  const knowledgeUrl = useAutoSaveField({
    formId,
    fieldKey: "knowledge_url",
    initialValue: content.knowledge_url || "",
  })

  const loadingFields = [loadingMessage1, loadingMessage2, loadingMessage3]

  // Состояние для кнопки "Улучшить с AI"
  const [isImproving, setIsImproving] = useState(false)

  // Ref для textarea с автоматическим расширением
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Автоматическое расширение textarea по высоте
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const updateHeight = () => {
      // Сбрасываем высоту для корректного расчета scrollHeight
      textarea.style.height = "auto"
      // Устанавливаем высоту на основе содержимого
      textarea.style.height = `${textarea.scrollHeight}px`
    }

    updateHeight()

    // Обновляем высоту при изменении размера окна
    window.addEventListener("resize", updateHeight)
    return () => window.removeEventListener("resize", updateHeight)
  }, [systemPrompt.value])

  const handleImprovePrompt = async () => {
    if (!systemPrompt.value.trim()) return

    setIsImproving(true)
    try {
      const response = await fetch("/api/improve-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: systemPrompt.value }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Ошибка улучшения промпта:", data.error)
        alert(data.error || "Не удалось улучшить промпт")
        return
      }

      if (data.improvedPrompt) {
        systemPrompt.onChange(data.improvedPrompt)
      }
    } catch (error) {
      console.error("Ошибка при вызове API:", error)
      alert("Произошла ошибка при улучшении промпта")
    } finally {
      setIsImproving(false)
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Генерация ответа */}
      <div className="space-y-4">
        <h3 className="text-2xl sm:text-3xl font-bold">Генерация ответа</h3>
        <AutoSaveFieldWrapper
          label="Напишите промпт или опишите идею для генерации ответа:"
          labelFor="system_prompt"
          status={systemPrompt.status}
        >
          <div className="flex items-center justify-end mb-2">
            <Button
              variant="default"
              onClick={handleImprovePrompt}
              disabled={isImproving || !systemPrompt.value.trim()}
              className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[30px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 text-sm sm:text-base"
            >
              {isImproving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Улучшаем...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Улучшить с AI
                </>
              )}
            </Button>
          </div>
          <Textarea
            ref={textareaRef}
            id="system_prompt"
            value={systemPrompt.value}
            onChange={(e) => systemPrompt.onChange(e.target.value)}
            placeholder="Плейсхолдер"
            rows={6}
            className="min-h-[150px] sm:min-h-[242px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6 py-4 resize-none overflow-hidden"
            style={{ height: "auto" }}
          />
        </AutoSaveFieldWrapper>
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
          {loadingFields.map((field, index) => (
            <AutoSaveFieldWrapper
              key={index}
              label={`Поле ${index + 1}`}
              labelFor={`loading_${index}`}
              status={field.status}
            >
              <Input
                id={`loading_${index}`}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={index === 0 ? "Просто" : index === 1 ? "Вкусно" : "Быстро"}
                className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
              />
            </AutoSaveFieldWrapper>
          ))}
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
          <span className="text-base sm:text-lg">
            Использовать базу знаний
          </span>
        </div>

        {/* База знаний / Другие данные */}
        <div className="space-y-2">
          <label className="text-base sm:text-lg">База знаний / Другие данные</label>
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
        <AutoSaveFieldWrapper
          label="Ссылка"
          labelFor="knowledge_url"
          status={knowledgeUrl.status}
        >
          <Input
            id="knowledge_url"
            value={knowledgeUrl.value}
            onChange={(e) => knowledgeUrl.onChange(e.target.value)}
            placeholder="Плейсхолдер"
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          />
        </AutoSaveFieldWrapper>
      </div>
    </div>
  )
}
