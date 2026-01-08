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
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useUpdateFormNotification, useUpdateFormRespondentEmail, useUpdateFormTheme } from "@/lib/hooks/use-forms"
import { useAutoSaveFormName } from "@/lib/hooks/use-autosave"
import { AutoSaveFieldWrapper } from "@/components/ui/auto-save-input"
import { toast } from "sonner"
import { AlertCircle } from "lucide-react"
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
}

/**
 * Загрузка данных формы
 */
async function fetchFormData(formId: string): Promise<FormData> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("forms")
    .select("id, name, notify_on_new_lead, send_email_to_respondent, theme")
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
  const queryClient = useQueryClient()

  const updateNotificationMutation = useUpdateFormNotification()
  const updateRespondentEmailMutation = useUpdateFormRespondentEmail()
  const updateThemeMutation = useUpdateFormTheme()

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

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl">
      <AutoSaveFieldWrapper
        label={t("editor.settingsTab.formName")}
        labelFor="formName"
        status={formName.status}
        counter={{ current: formName.value.length, max: 30 }}
      >
        <Input
          id="formName"
          value={formName.value}
          onChange={(e) => formName.onChange(e.target.value)}
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          placeholder={t("editor.settingsTab.formNamePlaceholder")}
          maxLength={30}
        />
      </AutoSaveFieldWrapper>

      <div className="rounded-[18px] border border-border p-4 sm:p-6 bg-[#f4f4f4] dark:bg-muted">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notify" className="text-base sm:text-lg font-medium">{t("editor.settingsTab.notifications")}</Label>
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
      </div>

      <div className="rounded-[18px] border border-border p-4 sm:p-6 bg-[#f4f4f4] dark:bg-muted">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="respondentEmail" className="text-base sm:text-lg font-medium">{t("editor.settingsTab.notifyRespondent")}</Label>
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
      </div>

      <div className="rounded-[18px] border border-border p-4 sm:p-6 bg-[#f4f4f4] dark:bg-muted">
        <div className="space-y-3">
          <div className="space-y-0.5">
            <Label htmlFor="theme" className="text-base sm:text-lg font-medium">{t("editor.settingsTab.theme")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("editor.settingsTab.themeDescription")}
            </p>
          </div>
          <Select
            value={theme}
            onValueChange={(value) => handleThemeChange(value as "light" | "dark")}
            disabled={updateThemeMutation.isPending}
          >
            <SelectTrigger 
              id="theme"
              className="h-12 sm:h-[70px] rounded-[18px] bg-white dark:bg-background border-border text-base sm:text-lg"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t("editor.settingsTab.themeLight")}</SelectItem>
              <SelectItem value="dark">{t("editor.settingsTab.themeDark")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
