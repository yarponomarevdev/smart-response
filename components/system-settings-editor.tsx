/**
 * SystemSettingsEditor - Редактор системных настроек
 * Доступен только для суперадминов
 * Позволяет настраивать глобальные промпты: для текста и для изображений
 */
"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Save, Settings, AlertCircle, CheckCircle2 } from "lucide-react"
import { getSystemSetting, updateSystemSetting } from "@/app/actions/system-settings"

export function SystemSettingsEditor() {
  const [userId, setUserId] = useState<string>("")
  const [globalTextPrompt, setGlobalTextPrompt] = useState<string>("")
  const [globalImagePrompt, setGlobalImagePrompt] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")

  const fetchSettings = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    setUserId(user.id)

    // Загружаем глобальный промпт для текста
    const { value: textValue, error: textError } = await getSystemSetting("global_text_prompt")
    
    if (textError) {
      setErrorMessage(textError)
      setSaveStatus("error")
    } else if (textValue) {
      setGlobalTextPrompt(textValue)
    }

    // Загружаем глобальный промпт для изображений
    const { value: imageValue, error: imageError } = await getSystemSetting("global_image_prompt")
    if (imageError) {
      setErrorMessage(imageError)
      setSaveStatus("error")
    } else if (imageValue) {
      setGlobalImagePrompt(imageValue)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Сбрасываем статус через 3 секунды
  useEffect(() => {
    if (saveStatus !== "idle") {
      const timer = setTimeout(() => setSaveStatus("idle"), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  const handleSave = async () => {
    if (!userId) return

    setIsSaving(true)
    setSaveStatus("idle")
    setErrorMessage("")

    // Сохраняем оба промпта
    const [textResult, imageResult] = await Promise.all([
      updateSystemSetting(userId, "global_text_prompt", globalTextPrompt),
      updateSystemSetting(userId, "global_image_prompt", globalImagePrompt),
    ])

    if (textResult.success && imageResult.success) {
      setSaveStatus("success")
    } else {
      setSaveStatus("error")
      setErrorMessage(textResult.error || imageResult.error || "Ошибка сохранения")
    }

    setIsSaving(false)
  }

  if (isLoading) {
    return <div className="text-center py-8">Загрузка настроек...</div>
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
              Системные настройки
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Глобальные настройки, применяемые ко всем формам
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="min-w-[140px] w-full sm:w-auto h-10 sm:h-11"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Сохранение..." : "Сохранить"}
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

        {saveStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 sm:space-y-6">
          {/* Глобальный промпт для текста */}
          <div className="p-3 sm:p-4 border border-accent/20 rounded-lg space-y-3 sm:space-y-4 bg-accent/5">
            <h3 className="text-base sm:text-lg font-semibold text-accent">
              Системный промпт для текста
            </h3>

            <div className="space-y-2">
              <Label htmlFor="global_text_prompt" className="text-sm">
                Инструкции AI для генерации текстовых результатов
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

          {/* Глобальный промпт для изображений */}
          <div className="p-3 sm:p-4 border border-purple-500/20 rounded-lg space-y-3 sm:space-y-4 bg-purple-500/5">
            <h3 className="text-base sm:text-lg font-semibold text-purple-500">
              Системный промпт для изображений (DALL-E)
            </h3>

            <div className="space-y-2">
              <Label htmlFor="global_image_prompt" className="text-sm">
                Инструкции AI для генерации промптов DALL-E
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
                Применяется к формам с форматом результата «Изображение». GPT использует этот промпт 
                для создания безопасного промпта DALL-E. Индивидуальный промпт формы добавляется сюда.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

