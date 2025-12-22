/**
 * FormsManager - Компонент управления формами пользователя
 * Поддерживает создание множества форм для админов, удаление форм,
 * настройку и встраивание форм на сайты
 * 
 * Использует React Query для кэширования данных
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Users, Code2, Settings, AlertCircle, Plus, Loader2, Trash2, FileEdit } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  useUserForms,
  useCreateForm,
  useDeleteForm,
  useUpdateFormName,
  useToggleFormActive,
  useUpdateFormNotification,
} from "@/lib/hooks"

interface Form {
  id: string
  name: string
  is_active: boolean
  lead_count: number
  lead_limit: number
  created_at: string
  owner_id: string
  actual_lead_count?: number
  notify_on_new_lead?: boolean
}

interface FormsManagerProps {
  onOpenEditor?: (formId: string) => void
}

export function FormsManager({ onOpenEditor }: FormsManagerProps = {}) {
  // React Query хуки
  const { data, isLoading, error: queryError } = useUserForms()
  const createFormMutation = useCreateForm()
  const deleteFormMutation = useDeleteForm()
  const updateNameMutation = useUpdateFormName()
  const toggleActiveMutation = useToggleFormActive()
  const updateNotificationMutation = useUpdateFormNotification()

  // Локальное состояние для UI
  const [error, setError] = useState<string | null>(null)
  
  // Диалоги
  const [showEmbedDialog, setShowEmbedDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  
  // Текущая форма для редактирования
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [formName, setFormName] = useState("")
  const [newFormName, setNewFormName] = useState("")
  const [notifyOnNewLead, setNotifyOnNewLead] = useState(true)

  const forms = data?.forms || []
  const totalLeads = data?.totalLeads || 0
  const limitInfo = data?.limitInfo || null

  // Проверяем ошибку перед проверкой загрузки
  if (queryError) {
    return (
      <div className="py-4">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium mb-2">Ошибка загрузки</p>
          <p className="text-sm text-muted-foreground">{queryError.message}</p>
        </div>
      </div>
    )
  }

  // Показываем загрузку, если данные еще не загрузились
  if (isLoading || !data) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  const createForm = async () => {
    setError(null)
    try {
      await createFormMutation.mutateAsync(newFormName || undefined)
      setNewFormName("")
      setShowCreateDialog(false)
      toast.success("Форма создана!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания формы")
    }
  }

  const handleDeleteForm = async () => {
    if (!selectedForm) return

    try {
      await deleteFormMutation.mutateAsync(selectedForm.id)
      setShowDeleteDialog(false)
      setSelectedForm(null)
      toast.success("Форма удалена!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления формы")
    }
  }

  const updateFormNameHandler = async () => {
    if (!selectedForm) return

    try {
      await updateNameMutation.mutateAsync({ formId: selectedForm.id, name: formName })
      setShowEditDialog(false)
      toast.success("Имя формы обновлено!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления имени")
    }
  }

  const toggleFormActive = async (form: Form) => {
    try {
      await toggleActiveMutation.mutateAsync({ formId: form.id, currentIsActive: form.is_active })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка изменения статуса")
    }
  }

  const copyFormLink = (form: Form) => {
    const link = `${window.location.origin}/form/${form.id}`
    navigator.clipboard.writeText(link)
    toast.success("Ссылка скопирована!")
  }

  const copyEmbedCode = () => {
    if (!selectedForm) return
    const embedCode = `<iframe src="${window.location.origin}/form/${selectedForm.id}" width="100%" height="700" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`
    navigator.clipboard.writeText(embedCode)
    toast.success("Код для встраивания скопирован!")
  }

  const openEditDialog = (form: Form) => {
    setSelectedForm(form)
    setFormName(form.name)
    setNotifyOnNewLead(form.notify_on_new_lead ?? true)
    setShowEditDialog(true)
  }

  const handleNotificationToggle = async (checked: boolean) => {
    if (!selectedForm) return

    try {
      await updateNotificationMutation.mutateAsync({ formId: selectedForm.id, notify: checked })
      setNotifyOnNewLead(checked)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления настройки")
    }
  }

  const openEmbedDialog = (form: Form) => {
    setSelectedForm(form)
    setShowEmbedDialog(true)
  }

  const openDeleteDialog = (form: Form) => {
    setSelectedForm(form)
    setShowDeleteDialog(true)
  }

  // Нет форм - показываем приглашение создать
  if (forms.length === 0) {
    return (
      <div className="py-4">
        <div className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Форм пока нет</p>
          <p className="text-sm text-muted-foreground mb-6">Создайте форму для сбора лидов</p>
          {error && (
            <Alert variant="destructive" className="mb-4 max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={() => setShowCreateDialog(true)} disabled={createFormMutation.isPending} className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[18px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 text-sm sm:text-base">
            Создать форму
          </Button>
          
          {/* Диалог создания */}
          <CreateFormDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            newFormName={newFormName}
            setNewFormName={setNewFormName}
            onCreate={createForm}
            creating={createFormMutation.isPending}
          />
        </div>
      </div>
    )
  }

  const isUnlimited = limitInfo?.limit === null

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Мои формы</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isUnlimited 
              ? `Всего форм: ${limitInfo?.currentCount || forms.length}` 
              : `Форм: ${limitInfo?.currentCount || forms.length} / ${limitInfo?.limit}`
            }
          </p>
          <p className="text-sm sm:text-base text-muted-foreground">
            Всего ответов: {totalLeads}
          </p>
        </div>
        {(limitInfo?.canCreate || isUnlimited) && (
          <Button onClick={() => setShowCreateDialog(true)} className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[18px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 text-sm sm:text-base w-full sm:w-auto">
            Создать форму
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Список форм */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => {
          return (
            <Card 
              key={form.id} 
              className="relative overflow-hidden"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <Badge variant={form.is_active ? "default" : "secondary"} className="shrink-0 text-xs whitespace-nowrap">
                    {form.is_active ? "Активна" : "Неактивна"}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg truncate">{form.name}</CardTitle>
                  <CardDescription className="text-xs font-mono truncate">
                    {form.id}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {/* Действия */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => onOpenEditor?.(form.id)} className="text-xs sm:text-sm h-8 sm:h-9">
                    <FileEdit className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Редактор</span>
                    <span className="sm:hidden">Редакт.</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyFormLink(form)} className="text-xs sm:text-sm h-8 sm:h-9">
                    <Copy className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Ссылка</span>
                    <span className="sm:hidden">Ссыл.</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(`/form/${form.id}`, "_blank")} className="text-xs sm:text-sm h-8 sm:h-9">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Открыть</span>
                    <span className="sm:hidden">Откр.</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEmbedDialog(form)} className="text-xs sm:text-sm h-8 sm:h-9">
                    <Code2 className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Код</span>
                    <span className="sm:hidden">Код</span>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(form)} className="text-xs sm:text-sm h-8 sm:h-9">
                    <Settings className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Настройки</span>
                    <span className="sm:hidden">Настр.</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleFormActive(form)}
                    disabled={toggleActiveMutation.isPending}
                    className="text-xs sm:text-sm h-8 sm:h-9"
                  >
                    {form.is_active ? "Выкл" : "Вкл"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive h-8 sm:h-9"
                    onClick={() => openDeleteDialog(form)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Создана: {new Date(form.created_at).toLocaleDateString("ru-RU")}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Диалог создания формы */}
      <CreateFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        newFormName={newFormName}
        setNewFormName={setNewFormName}
        onCreate={createForm}
        creating={createFormMutation.isPending}
      />

      {/* Диалог встраивания */}
      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Встроить форму на сайт</DialogTitle>
            <DialogDescription className="text-sm">Скопируйте этот код и вставьте на ваш сайт</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              readOnly
              value={selectedForm ? `<iframe src="${window.location.origin}/form/${selectedForm.id}" width="100%" height="700" frameborder="0" style="border: none; border-radius: 8px;"></iframe>` : ""}
              className="font-mono text-xs"
              rows={4}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={copyEmbedCode} className="flex-1 h-10 sm:h-11">
                <Copy className="h-4 w-4 mr-2" />
                Копировать код
              </Button>
              <Button variant="outline" onClick={() => setShowEmbedDialog(false)} className="h-10 sm:h-11">
                Закрыть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Настройки формы</DialogTitle>
            <DialogDescription className="text-sm">Настройте параметры вашей формы</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="formName">Название формы</Label>
              <Input id="formName" value={formName} onChange={(e) => setFormName(e.target.value)} className="mt-2 h-10 sm:h-11" />
            </div>
            
            {/* Настройка email уведомлений */}
            <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4">
              <div className="space-y-0.5">
                <Label htmlFor="notify" className="text-sm font-medium">Email уведомления</Label>
                <p className="text-xs text-muted-foreground">
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

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={updateFormNameHandler} disabled={updateNameMutation.isPending} className="flex-1 h-10 sm:h-11">
                {updateNameMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="h-10 sm:h-11">
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог удаления */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Удалить форму?</DialogTitle>
            <DialogDescription className="text-sm">
              Форма &quot;{selectedForm?.name}&quot; будет удалена вместе со всеми лидами. Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="w-full sm:w-auto h-10 sm:h-11">
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteForm}
              disabled={deleteFormMutation.isPending}
              className="w-full sm:w-auto h-10 sm:h-11"
            >
              {deleteFormMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Диалог создания новой формы
 */
function CreateFormDialog({
  open,
  onOpenChange,
  newFormName,
  setNewFormName,
  onCreate,
  creating,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  newFormName: string
  setNewFormName: (name: string) => void
  onCreate: () => void
  creating: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Создать новую форму</DialogTitle>
          <DialogDescription className="text-sm">
            Введите название для новой формы сбора лидов
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="newFormName">Название формы</Label>
            <Input 
              id="newFormName" 
              value={newFormName} 
              onChange={(e) => setNewFormName(e.target.value)} 
              placeholder="Моя форма"
              className="mt-2 h-10 sm:h-11" 
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={onCreate} className="flex-1 h-10 sm:h-11" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Создать
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 sm:h-11">
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
