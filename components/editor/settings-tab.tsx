/**
 * SettingsTab - Вкладка "Настройки"
 * Позволяет настраивать параметры формы:
 * - Название формы (с автосохранением)
 * - Email уведомления владельцу при новой заявке
 * - Email респонденту с результатом
 */
"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useUpdateFormNotification, useUpdateFormRespondentEmail, useUpdateFormTheme, useUpdateFormLanguage } from "@/lib/hooks/use-forms"
import { useAutoSaveFormName } from "@/lib/hooks/use-autosave"
import { SaveStatusIndicator } from "@/components/ui/auto-save-input"
import { toast } from "sonner"
import { AlertCircle, Mail, Globe, Palette, Type } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

interface SettingsTabProps {
  formId: string | null
}

interface FormData {
  id: string
  name: string
  notify_on_new_lead: boolean
  send_email_to_respondent: boolean
  theme: "light" | "dark"
  language: "ru" | "en"
}

/**
 * Загрузка данных формы
 */
async function fetchFormData(formId: string): Promise<FormData> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("forms")
    .select("id, name, notify_on_new_lead, send_email_to_respondent, theme, language")
    .eq("id", formId)
    .single()

  if (error || !data) {
    throw new Error(error?.message || "Не удалось загрузить данные формы")
  }

  return data
}

export function SettingsTab({ formId }: SettingsTabProps) {
  const { t } = useTranslation()
  const [notifyOnNewLead, setNotifyOnNewLead] = useState(true)
  const [sendEmailToRespondent, setSendEmailToRespondent] = useState(true)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [language, setLanguage] = useState<"ru" | "en">("ru")
  const queryClient = useQueryClient()

  const updateNotificationMutation = useUpdateFormNotification()
  const updateRespondentEmailMutation = useUpdateFormRespondentEmail()
  const updateThemeMutation = useUpdateFormTheme()
  const updateLanguageMutation = useUpdateFormLanguage()

  // Загружаем данные формы
  const { data: formData, isLoading, error } = useQuery({
    queryKey: ["formSettings", formId],
    queryFn: () => fetchFormData(formId!),
    enabled: !!formId,
    staleTime: 5 * 60 * 1000,
  })

  // Автосохранение названия формы
  const formName = useAutoSaveFormName({
    formId,
    initialValue: formData?.name || "",
    maxLength: 30,
  })

  // Обновляем локальное состояние уведомлений при загрузке данных
  useEffect(() => {
    if (formData) {
      setNotifyOnNewLead(formData.notify_on_new_lead ?? true)
      setSendEmailToRespondent(formData.send_email_to_respondent ?? true)
      setTheme(formData.theme ?? "light")
      setLanguage(formData.language ?? "ru")
    }
  }, [formData])

  if (!formId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("editor.settingsTab.noForm")}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("editor.settingsTab.loadingSettings")}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium mb-2">{t("editor.settingsTab.loadingError")}</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  const handleNotificationToggle = async (checked: boolean) => {
    if (!formId) return

    try {
      await updateNotificationMutation.mutateAsync({ formId, value: checked })
      setNotifyOnNewLead(checked)
      toast.success(checked ? t("editor.settingsTab.notificationsEnabled") : t("editor.settingsTab.notificationsDisabled"))
    } catch (err) {
      toast.error(t("editor.settingsTab.updateError") + ": " + (err instanceof Error ? err.message : t("errors.networkError")))
    }
  }

  const handleRespondentEmailToggle = async (checked: boolean) => {
    if (!formId) return

    try {
      await updateRespondentEmailMutation.mutateAsync({ formId, value: checked })
      setSendEmailToRespondent(checked)
      toast.success(checked ? t("editor.settingsTab.respondentEmailEnabled") : t("editor.settingsTab.respondentEmailDisabled"))
    } catch (err) {
      toast.error(t("editor.settingsTab.updateError") + ": " + (err instanceof Error ? err.message : t("errors.networkError")))
    }
  }

  const handleThemeChange = async (newTheme: "light" | "dark") => {
    if (!formId) return

    try {
      await updateThemeMutation.mutateAsync({ formId, value: newTheme })
      setTheme(newTheme)
      const themeNames = { light: t("editor.settingsTab.themeLight"), dark: t("editor.settingsTab.themeDark") }
      toast.success(t("editor.settingsTab.themeChanged").replace("{theme}", themeNames[newTheme]))
    } catch (err) {
      toast.error(t("editor.settingsTab.themeUpdateError") + ": " + (err instanceof Error ? err.message : t("errors.networkError")))
    }
  }

  const handleLanguageChange = async (newLanguage: "ru" | "en") => {
    if (!formId) return

    try {
      await updateLanguageMutation.mutateAsync({ formId, value: newLanguage })
      setLanguage(newLanguage)
      const languageNames = { ru: t("editor.settingsTab.languageRussian"), en: t("editor.settingsTab.languageEnglish") }
      toast.success(t("editor.settingsTab.languageChanged").replace("{language}", languageNames[newLanguage]))
    } catch (err) {
      toast.error(t("editor.settingsTab.languageUpdateError") + ": " + (err instanceof Error ? err.message : t("errors.networkError")))
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mr-auto pb-10">
      
      {/* Основные настройки */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("editor.settingsTab.basicSettings")}</CardTitle>
          <CardDescription>
            {t("editor.settingsTab.basicSettingsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Название формы */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Type className="h-4 w-4" />
                <Label htmlFor="formName">{t("editor.settingsTab.formName")}</Label>
              </div>
              <SaveStatusIndicator status={formName.status} />
            </div>
            <Input
              id="formName"
              value={formName.value}
              onChange={(e) => formName.onChange(e.target.value)}
              className="max-w-md"
              placeholder={t("editor.settingsTab.formNamePlaceholder")}
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              {formName.value.length}/30 символов
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Тема */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Palette className="h-4 w-4" />
                <Label htmlFor="theme">{t("editor.settingsTab.theme")}</Label>
              </div>
              <Select
                value={theme}
                onValueChange={(value) => handleThemeChange(value as "light" | "dark")}
                disabled={updateThemeMutation.isPending}
              >
                <SelectTrigger id="theme" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("editor.settingsTab.themeLight")}</SelectItem>
                  <SelectItem value="dark">{t("editor.settingsTab.themeDark")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("editor.settingsTab.themeDescription")}
              </p>
            </div>

            {/* Язык */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Globe className="h-4 w-4" />
                <Label htmlFor="language">{t("editor.settingsTab.formLanguage")}</Label>
              </div>
              <Select
                value={language}
                onValueChange={(value) => handleLanguageChange(value as "ru" | "en")}
                disabled={updateLanguageMutation.isPending}
              >
                <SelectTrigger id="language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">{t("editor.settingsTab.languageRussian")}</SelectItem>
                  <SelectItem value="en">{t("editor.settingsTab.languageEnglish")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("editor.settingsTab.formLanguageDescription")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Уведомления */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("editor.settingsTab.notificationsTitle")}
          </CardTitle>
          <CardDescription>
            {t("editor.settingsTab.notificationsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email уведомления */}
          <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="notify" className="text-base font-medium">
                {t("editor.settingsTab.notifications")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("editor.settingsTab.notificationsDesc")}
              </p>
            </div>
            <Switch
              id="notify"
              checked={notifyOnNewLead}
              onCheckedChange={handleNotificationToggle}
              disabled={updateNotificationMutation.isPending}
            />
          </div>

          {/* Email респонденту */}
          <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="respondentEmail" className="text-base font-medium">
                {t("editor.settingsTab.notifyRespondent")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("editor.settingsTab.notifyRespondentDesc")}
              </p>
            </div>
            <Switch
              id="respondentEmail"
              checked={sendEmailToRespondent}
              onCheckedChange={handleRespondentEmailToggle}
              disabled={updateRespondentEmailMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
