/**
 * SystemSettingsEditor - Редактор системных настроек
 * Доступен только для суперадминов
 * Позволяет настраивать глобальный системный промпт для всех форм
 */
"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Save, Settings, AlertCircle, CheckCircle2, Info } from "lucide-react"
import { getSystemSetting, updateSystemSetting } from "@/app/actions/system-settings"

export function SystemSettingsEditor() {
  const [userId, setUserId] = useState<string>("")
  const [globalPrompt, setGlobalPrompt] = useState<string>("")
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

    // Загружаем глобальный системный промпт
    const { value, error } = await getSystemSetting("global_system_prompt")
    
    if (error) {
      setErrorMessage(error)
      setSaveStatus("error")
    } else if (value) {
      setGlobalPrompt(value)
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

    const result = await updateSystemSetting(userId, "global_system_prompt", globalPrompt)

    if (result.success) {
      setSaveStatus("success")
    } else {
      setSaveStatus("error")
      setErrorMessage(result.error || "Ошибка сохранения")
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
          {/* Информационное сообщение */}
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-500">Как это работает</AlertTitle>
            <AlertDescription className="text-blue-500/80">
              Глобальный системный промпт добавляется как <strong>префикс</strong> к индивидуальным 
              промптам каждой формы. Это позволяет задать общие правила и форматирование для всех 
              форм, сохраняя при этом возможность кастомизации каждой формы.
            </AlertDescription>
          </Alert>

          {/* Глобальный системный промпт */}
          <div className="p-3 sm:p-4 border border-accent/20 rounded-lg space-y-3 sm:space-y-4 bg-accent/5">
            <h3 className="text-base sm:text-lg font-semibold text-accent">
              Глобальный системный промпт
            </h3>

            <div className="space-y-2">
              <Label htmlFor="global_prompt" className="text-sm">
                Базовые инструкции для AI (добавляются ко всем формам)
              </Label>
              <Textarea
                id="global_prompt"
                value={globalPrompt}
                onChange={(e) => setGlobalPrompt(e.target.value)}
                placeholder="Введите глобальный системный промпт..."
                rows={12}
                className="font-mono text-xs sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Этот текст будет добавлен в начало системного промпта каждой формы при генерации результатов.
                Используйте его для задания общего тона, языка и формата ответов.
              </p>
            </div>
          </div>

          {/* Пример итогового промпта */}
          <div className="p-3 sm:p-4 border border-muted rounded-lg space-y-3 bg-muted/20">
            <h3 className="text-base sm:text-lg font-semibold text-muted-foreground">
              Пример итогового промпта
            </h3>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                При генерации результата итоговый промпт будет выглядеть так:
              </p>
              <div className="bg-background p-3 rounded border text-xs font-mono whitespace-pre-wrap break-words">
                <span className="text-accent">{globalPrompt || "(глобальный промпт не задан)"}</span>
                <br /><br />
                <span className="text-muted-foreground">---</span>
                <br /><br />
                <span className="text-foreground/70">(индивидуальный промпт формы)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

