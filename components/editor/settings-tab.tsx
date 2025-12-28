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
        Форма не выбрана
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Загрузка настроек...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium mb-2">Ошибка загрузки настроек</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  const handleNotificationToggle = async (checked: boolean) => {
    if (!formId) return

    try {
      await updateNotificationMutation.mutateAsync({ formId, value: checked })
      setNotifyOnNewLead(checked)
      toast.success(checked ? "Уведомления включены" : "Уведомления отключены")
    } catch (err) {
      toast.error("Ошибка обновления настройки: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
    }
  }

  const handleRespondentEmailToggle = async (checked: boolean) => {
    if (!formId) return

    try {
      await updateRespondentEmailMutation.mutateAsync({ formId, value: checked })
      setSendEmailToRespondent(checked)
      toast.success(checked ? "Отправка писем респондентам включена" : "Отправка писем респондентам отключена")
    } catch (err) {
      toast.error("Ошибка обновления настройки: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
    }
  }

  const handleThemeChange = async (newTheme: "light" | "dark") => {
    if (!formId) return

    try {
      await updateThemeMutation.mutateAsync({ formId, value: newTheme })
      setTheme(newTheme)
      const themeNames = { light: "Светлая", dark: "Тёмная" }
      toast.success(`Тема изменена на "${themeNames[newTheme]}"`)
    } catch (err) {
      toast.error("Ошибка обновления темы: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl">
      <AutoSaveFieldWrapper
        label="Название формы"
        labelFor="formName"
        status={formName.status}
        counter={{ current: formName.value.length, max: 30 }}
      >
        <Input
          id="formName"
          value={formName.value}
          onChange={(e) => formName.onChange(e.target.value)}
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          placeholder="Название формы"
          maxLength={30}
        />
      </AutoSaveFieldWrapper>

      <div className="rounded-[18px] border border-border p-4 sm:p-6 bg-[#f4f4f4] dark:bg-muted">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notify" className="text-base sm:text-lg font-medium">Email уведомления</Label>
            <p className="text-sm text-muted-foreground">
              Получать письмо при новой заявке
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
            <Label htmlFor="respondentEmail" className="text-base sm:text-lg font-medium">Email респонденту</Label>
            <p className="text-sm text-muted-foreground">
              Отправлять письмо с результатом заполнившему форму
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
            <Label htmlFor="theme" className="text-base sm:text-lg font-medium">Тема формы</Label>
            <p className="text-sm text-muted-foreground">
              Выберите тему отображения для вашей формы
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
              <SelectItem value="light">Светлая</SelectItem>
              <SelectItem value="dark">Тёмная</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
