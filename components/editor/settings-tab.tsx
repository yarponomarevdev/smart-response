/**
 * SettingsTab - Вкладка "Настройки"
 * Позволяет настраивать параметры формы: название и email уведомления
 */
"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useUpdateFormName, useUpdateFormNotification } from "@/lib/hooks/use-forms"
import { toast } from "sonner"
import { AlertCircle } from "lucide-react"

interface SettingsTabProps {
  formId: string | null
}

interface FormData {
  id: string
  name: string
  notify_on_new_lead: boolean
}

/**
 * Загрузка данных формы
 */
async function fetchFormData(formId: string): Promise<FormData> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("forms")
    .select("id, name, notify_on_new_lead")
    .eq("id", formId)
    .single()

  if (error || !data) {
    throw new Error(error?.message || "Не удалось загрузить данные формы")
  }

  return data
}

export function SettingsTab({ formId }: SettingsTabProps) {
  const [formName, setFormName] = useState("")
  const [notifyOnNewLead, setNotifyOnNewLead] = useState(true)
  const queryClient = useQueryClient()

  const updateNameMutation = useUpdateFormName()
  const updateNotificationMutation = useUpdateFormNotification()

  // Загружаем данные формы
  const { data: formData, isLoading, error } = useQuery({
    queryKey: ["formSettings", formId],
    queryFn: () => fetchFormData(formId!),
    enabled: !!formId,
    staleTime: 5 * 60 * 1000,
  })

  // Обновляем локальное состояние при загрузке данных
  useEffect(() => {
    if (formData) {
      setFormName(formData.name)
      setNotifyOnNewLead(formData.notify_on_new_lead ?? true)
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

  const handleSaveName = async () => {
    if (!formId || !formName.trim()) return

    try {
      await updateNameMutation.mutateAsync({ formId, name: formName })
      // Инвалидируем кэш настроек формы для обновления данных
      queryClient.invalidateQueries({ queryKey: ["formSettings", formId] })
      toast.success("Название формы обновлено!")
    } catch (err) {
      toast.error("Ошибка обновления названия: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
    }
  }

  const handleNotificationToggle = async (checked: boolean) => {
    if (!formId) return

    try {
      await updateNotificationMutation.mutateAsync({ formId, notify: checked })
      setNotifyOnNewLead(checked)
      // Инвалидируем кэш настроек формы для обновления данных
      queryClient.invalidateQueries({ queryKey: ["formSettings", formId] })
      toast.success(checked ? "Уведомления включены" : "Уведомления отключены")
    } catch (err) {
      toast.error("Ошибка обновления настройки: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="formName" className="text-base sm:text-lg">Название формы</Label>
        <div className="flex flex-col gap-3">
          <Input
            id="formName"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
            placeholder="Название формы"
          />
          <Button
            onClick={handleSaveName}
            disabled={updateNameMutation.isPending || !formName.trim()}
            className="h-12 sm:h-14 rounded-[18px] w-full text-base sm:text-lg"
          >
            {updateNameMutation.isPending ? "Сохранение..." : "Сохранить название"}
          </Button>
        </div>
      </div>

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
    </div>
  )
}

