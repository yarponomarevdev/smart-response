/**
 * SystemSettingsEditor - Редактор системных настроек
 * Доступен только для суперадминов
 * Позволяет настраивать глобальные промпты: для текста и для изображений
 * 
 * Использует React Query для кэширования данных
 */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"

// Доступные модели OpenAI
const TEXT_MODELS = [
  { value: "gpt-5.1", label: "GPT-5.1" },
  { value: "gpt-5.1-mini", label: "GPT-5.1 Mini" },
  { value: "gpt-5.1-nano", label: "GPT-5.1 Nano" },
  { value: "gpt-5.2", label: "GPT-5.2" },
  { value: "gpt-5.2-mini", label: "GPT-5.2 Mini" },
  { value: "gpt-5.2-nano", label: "GPT-5.2 Nano" },
]

const IMAGE_MODELS = [
  { value: "gpt-image-1", label: "GPT-Image-1" },
  { value: "gpt-image-1.5", label: "GPT-Image-1.5" },
]
import { useSystemSettings, useSaveSystemSettings } from "@/lib/hooks"

export function SystemSettingsEditor() {
  // React Query хуки
  const { data, isLoading, error: queryError } = useSystemSettings()
  const saveSettingsMutation = useSaveSystemSettings()

  // Локальное состояние для редактирования
  const [globalTextPrompt, setGlobalTextPrompt] = useState<string>("")
  const [globalImagePrompt, setGlobalImagePrompt] = useState<string>("")
  const [textModel, setTextModel] = useState<string>("")
  const [imageModel, setImageModel] = useState<string>("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  // Синхронизируем локальное состояние с данными из кэша
  useEffect(() => {
    if (data) {
      setGlobalTextPrompt(data.globalTextPrompt)
      setGlobalImagePrompt(data.globalImagePrompt)
      setTextModel(data.textModel)
      setImageModel(data.imageModel)
    }
  }, [data])

  // Сбрасываем статус через 3 секунды
  useEffect(() => {
    if (saveStatus !== "idle") {
      const timer = setTimeout(() => setSaveStatus("idle"), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  const handleSave = async () => {
    setSaveStatus("idle")

    try {
      await saveSettingsMutation.mutateAsync({
        globalTextPrompt,
        globalImagePrompt,
        textModel,
        imageModel,
      })
      setSaveStatus("success")
    } catch (err) {
      setSaveStatus("error")
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Загрузка настроек...</div>
  }

  if (queryError) {
    return (
      <div className="py-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка загрузки</AlertTitle>
          <AlertDescription>{queryError.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="py-4">
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Системные настройки
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Глобальные настройки, применяемые ко всем формам
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saveSettingsMutation.isPending} 
            className="h-12 w-full sm:w-[200px] rounded-[18px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saveSettingsMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>

        {/* Статус сохранения */}
        {saveStatus === "success" && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">Сохранено</AlertTitle>
            <AlertDescription className="text-green-500/80">
              Системные настройки успешно обновлены
            </AlertDescription>
          </Alert>
        )}

        {(saveStatus === "error" || saveSettingsMutation.error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>
              {saveSettingsMutation.error?.message || "Ошибка сохранения"}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 sm:space-y-6">
          {/* Настройки генерации текста */}
          <div className="p-3 sm:p-4 border border-accent/20 rounded-lg space-y-3 sm:space-y-4 bg-accent/5">
            <h3 className="text-base sm:text-lg font-semibold text-accent">
              Генерация текста
            </h3>

            {/* Выбор модели для текста */}
            <div className="space-y-2">
              <Label htmlFor="text_model" className="text-sm">
                Модель OpenAI для генерации текста
              </Label>
              <Select value={textModel} onValueChange={setTextModel}>
                <SelectTrigger id="text_model" className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Выберите модель..." />
                </SelectTrigger>
                <SelectContent>
                  {TEXT_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!textModel && (
                <div className="flex items-center gap-2 text-amber-500 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Модель не выбрана. Генерация текста не будет работать.</span>
                </div>
              )}
            </div>

            {/* Промпт для текста */}
            <div className="space-y-2">
              <Label htmlFor="global_text_prompt" className="text-sm">
                Системный промпт
              </Label>
              <Textarea
                id="global_text_prompt"
                value={globalTextPrompt}
                onChange={(e) => setGlobalTextPrompt(e.target.value)}
                placeholder="Введите системный промпт для текстового формата..."
                rows={12}
                className="font-mono text-xs sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Применяется к формам с форматом результата «Текст». Индивидуальный промпт формы 
                (если задан) добавляется к этому глобальному промпту.
              </p>
            </div>
          </div>

          {/* Настройки генерации изображений */}
          <div className="p-3 sm:p-4 border border-purple-500/20 rounded-lg space-y-3 sm:space-y-4 bg-purple-500/5">
            <h3 className="text-base sm:text-lg font-semibold text-purple-500">
              Генерация изображений
            </h3>

            {/* Выбор модели для изображений */}
            <div className="space-y-2">
              <Label htmlFor="image_model" className="text-sm">
                Модель OpenAI для генерации изображений
              </Label>
              <Select value={imageModel} onValueChange={setImageModel}>
                <SelectTrigger id="image_model" className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Выберите модель..." />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!imageModel && (
                <div className="flex items-center gap-2 text-amber-500 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Модель не выбрана. Генерация изображений не будет работать.</span>
                </div>
              )}
            </div>

            {/* Промпт для изображений */}
            <div className="space-y-2">
              <Label htmlFor="global_image_prompt" className="text-sm">
                Системный промпт
              </Label>
              <Textarea
                id="global_image_prompt"
                value={globalImagePrompt}
                onChange={(e) => setGlobalImagePrompt(e.target.value)}
                placeholder="Введите системный промпт для генерации изображений..."
                rows={10}
                className="font-mono text-xs sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Применяется к формам с форматом результата «Изображение». Модель использует этот промпт 
                для создания изображения. Индивидуальный промпт формы добавляется сюда.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
