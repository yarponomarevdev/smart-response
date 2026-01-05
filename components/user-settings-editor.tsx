/**
 * UserSettingsEditor - Редактор пользовательских настроек
 * Доступен всем пользователям
 * Позволяет настраивать персональные параметры: язык интерфейса
 */
"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { useUpdateUserLanguage } from "@/lib/hooks"
import { useTranslation } from "@/lib/i18n"

export function UserSettingsEditor() {
  const { t, language, setLanguage } = useTranslation()
  const updateLanguageMutation = useUpdateUserLanguage()
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  // Сбрасываем статус через 3 секунды
  useEffect(() => {
    if (saveStatus !== "idle") {
      const timer = setTimeout(() => setSaveStatus("idle"), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  const handleLanguageChange = async (newLanguage: "ru" | "en") => {
    setSaveStatus("idle")
    
    try {
      await updateLanguageMutation.mutateAsync(newLanguage)
      setLanguage(newLanguage)
      setSaveStatus("success")
    } catch (err) {
      setSaveStatus("error")
    }
  }

  return (
    <div className="py-4">
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {t("settings.user.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("settings.user.description")}
          </p>
        </div>

        {/* Статус сохранения */}
        {saveStatus === "success" && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">{t("notifications.saved")}</AlertTitle>
            <AlertDescription className="text-green-500/80">
              {t("notifications.languageChanged")}
            </AlertDescription>
          </Alert>
        )}

        {(saveStatus === "error" || updateLanguageMutation.error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("common.error")}</AlertTitle>
            <AlertDescription>
              {updateLanguageMutation.error?.message || t("errors.savingFailed")}
            </AlertDescription>
          </Alert>
        )}

        {/* Настройка языка */}
        <div className="p-3 sm:p-4 border border-accent/20 rounded-lg space-y-3 sm:space-y-4 bg-accent/5">
          <div className="space-y-2">
            <Label htmlFor="language" className="text-sm">
              {t("settings.user.language.label")}
            </Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger id="language" className="w-full sm:w-[300px]">
                <SelectValue placeholder={t("settings.user.language.description")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">
                  {t("settings.user.language.russian")}
                </SelectItem>
                <SelectItem value="en">
                  {t("settings.user.language.english")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("settings.user.language.description")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
