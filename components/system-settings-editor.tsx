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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, AlertTriangle, Languages, MessageSquareText, Image as ImageIcon } from "lucide-react"
import { useUpdateUserLanguage } from "@/lib/hooks"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"

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
  const updateLanguageMutation = useUpdateUserLanguage()
  const { t, language, setLanguage } = useTranslation()

  // Локальное состояние для редактирования
  const [globalTextPrompt, setGlobalTextPrompt] = useState<string>("")
  const [globalImagePrompt, setGlobalImagePrompt] = useState<string>("")
  const [textModel, setTextModel] = useState<string>("")
  const [imageModel, setImageModel] = useState<string>("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [languageSaveStatus, setLanguageSaveStatus] = useState<"idle" | "success" | "error">("idle")

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

  // Сбрасываем статус языка через 3 секунды
  useEffect(() => {
    if (languageSaveStatus !== "idle") {
      const timer = setTimeout(() => setLanguageSaveStatus("idle"), 3000)
      return () => clearTimeout(timer)
    }
  }, [languageSaveStatus])

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

  const handleLanguageChange = async (newLanguage: "ru" | "en") => {
    setLanguageSaveStatus("idle")
    
    try {
      await updateLanguageMutation.mutateAsync(newLanguage)
      setLanguage(newLanguage)
      setLanguageSaveStatus("success")
    } catch (err) {
      setLanguageSaveStatus("error")
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">{t("settings.system.loadingSettings")}</div>
  }

  if (queryError) {
    return (
      <div className="py-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("settings.system.loadingError")}</AlertTitle>
          <AlertDescription>{queryError.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="py-4 space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("settings.system.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("settings.system.description")}
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saveSettingsMutation.isPending} 
          className="h-10 sm:h-12 w-full sm:w-auto min-w-[140px] rounded-[18px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saveSettingsMutation.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>

      {/* Статус сохранения */}
      {saveStatus === "success" && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-500">{t("notifications.saved")}</AlertTitle>
          <AlertDescription className="text-green-500/80">
            {t("notifications.settingsSaved")}
          </AlertDescription>
        </Alert>
      )}

      {(saveStatus === "error" || saveSettingsMutation.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>
            {saveSettingsMutation.error?.message || t("errors.savingFailed")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:gap-6">
        {/* Карточка Языка */}
        <Card className="py-4 sm:py-5 gap-4 sm:gap-5">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">{t("settings.user.language.label")}</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">{t("settings.user.language.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <button
                onClick={() => handleLanguageChange("ru")}
                disabled={updateLanguageMutation.isPending}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all hover:scale-[1.02]",
                  language === "ru" 
                    ? "border-primary bg-primary/10 shadow-sm" 
                    : "border-border bg-muted/30 hover:bg-muted/50"
                )}
              >
                <span className="text-2xl">🇷🇺</span>
                <span className={cn("text-sm sm:text-base", language === "ru" && "font-semibold")}>
                  {t("settings.user.language.russian")}
                </span>
              </button>
              <button
                onClick={() => handleLanguageChange("en")}
                disabled={updateLanguageMutation.isPending}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all hover:scale-[1.02]",
                  language === "en" 
                    ? "border-primary bg-primary/10 shadow-sm" 
                    : "border-border bg-muted/30 hover:bg-muted/50"
                )}
              >
                <span className="text-2xl">🇬🇧</span>
                <span className={cn("text-sm sm:text-base", language === "en" && "font-semibold")}>
                  {t("settings.user.language.english")}
                </span>
              </button>
            </div>

            {languageSaveStatus === "success" && (
              <p className="text-xs sm:text-sm text-green-600 mt-3 flex items-center">
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                {t("notifications.languageChanged")}
              </p>
            )}
            {(languageSaveStatus === "error" || updateLanguageMutation.error) && (
              <p className="text-xs sm:text-sm text-destructive mt-3">
                {updateLanguageMutation.error?.message || t("errors.savingFailed")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Карточка генерации текста */}
        <Card className="py-4 sm:py-5 gap-4 sm:gap-5">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">{t("settings.system.textGeneration")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Выбор модели для текста */}
            <div className="space-y-2">
              <Label htmlFor="text_model" className="text-sm font-medium">
                {t("settings.system.textModel")}
              </Label>
              <Select value={textModel} onValueChange={setTextModel}>
                <SelectTrigger id="text_model" className="w-full sm:w-[300px] h-9 sm:h-10 text-sm">
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
                <div className="flex items-center gap-2 text-amber-500 text-xs mt-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{t("settings.system.modelNotSelected")}</span>
                </div>
              )}
            </div>

            {/* Промпт для текста */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="global_text_prompt" className="text-sm font-medium">
                  {t("settings.system.systemPrompt")}
                </Label>
                <span className="text-xs text-muted-foreground hidden sm:inline-block">
                  {t("settings.system.textPromptDescription")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground sm:hidden mb-2">
                {t("settings.system.textPromptDescription")}
              </p>
              <Textarea
                id="global_text_prompt"
                value={globalTextPrompt}
                onChange={(e) => setGlobalTextPrompt(e.target.value)}
                placeholder="Введите системный промпт для текстового формата..."
                rows={12}
                className="font-mono text-xs sm:text-sm resize-y min-h-[200px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Карточка генерации изображений */}
        <Card className="py-4 sm:py-5 gap-4 sm:gap-5">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">{t("settings.system.imageGeneration")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Выбор модели для изображений */}
            <div className="space-y-2">
              <Label htmlFor="image_model" className="text-sm font-medium">
                {t("settings.system.imageModel")}
              </Label>
              <Select value={imageModel} onValueChange={setImageModel}>
                <SelectTrigger id="image_model" className="w-full sm:w-[300px] h-9 sm:h-10 text-sm">
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
                <div className="flex items-center gap-2 text-amber-500 text-xs mt-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{t("settings.system.modelNotSelected")}</span>
                </div>
              )}
            </div>

            {/* Промпт для изображений */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="global_image_prompt" className="text-sm font-medium">
                  {t("settings.system.systemPrompt")}
                </Label>
                <span className="text-xs text-muted-foreground hidden sm:inline-block">
                  {t("settings.system.imagePromptDescription")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground sm:hidden mb-2">
                {t("settings.system.imagePromptDescription")}
              </p>
              <Textarea
                id="global_image_prompt"
                value={globalImagePrompt}
                onChange={(e) => setGlobalImagePrompt(e.target.value)}
                placeholder="Введите системный промпт для генерации изображений..."
                rows={10}
                className="font-mono text-xs sm:text-sm resize-y min-h-[150px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
