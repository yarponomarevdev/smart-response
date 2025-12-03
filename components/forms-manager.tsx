/**
 * FormsManager - Компонент управления формами пользователя
 * Поддерживает создание множества форм для админов, удаление форм,
 * настройку и встраивание форм на сайты
 */
"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Users, Code2, Settings, AlertCircle, Plus, Loader2, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createUserForm, deleteUserForm, canCreateMoreForms } from "@/app/actions/forms"

interface Form {
  id: string
  name: string
  is_active: boolean
  lead_count: number
  lead_limit: number
  created_at: string
  owner_id: string
  actual_lead_count?: number // Реальное количество лидов из таблицы leads
}

interface FormLimitInfo {
  canCreate: boolean
  currentCount: number
  limit: number | null
}

export function FormsManager() {
  const [forms, setForms] = useState<Form[]>([])
  const [userId, setUserId] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [limitInfo, setLimitInfo] = useState<FormLimitInfo | null>(null)
  
  // Диалоги
  const [showEmbedDialog, setShowEmbedDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  
  // Текущая форма для редактирования
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [formName, setFormName] = useState("")
  const [newFormName, setNewFormName] = useState("")

  const fetchUserForms = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      setUserId(user.id)
      setUserEmail(user.email || "")

      // Загружаем все формы пользователя
      const { data: userForms } = await supabase
        .from("forms")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })

      if (userForms) {
        // Для каждой формы получаем реальное количество лидов
        const formsWithLeadCount = await Promise.all(
          userForms.map(async (form) => {
            const { count } = await supabase
              .from("leads")
              .select("*", { count: "exact", head: true })
              .eq("form_id", form.id)
            
            return {
              ...form,
              actual_lead_count: count || 0,
            }
          })
        )
        
        setForms(formsWithLeadCount)
      }

      // Проверяем лимит форм
      const info = await canCreateMoreForms(user.id)
      setLimitInfo(info)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUserForms()
  }, [fetchUserForms])

  const createForm = async () => {
    if (!userId || !userEmail) return

    setCreating(true)
    setError(null)

    const result = await createUserForm(userId, userEmail, newFormName || undefined)

    if (result.error) {
      setError(result.error)
      setCreating(false)
      return
    }

    if (result.form) {
      // Добавляем реальное количество лидов (для новой формы всегда 0)
      const formWithLeadCount = {
        ...result.form,
        actual_lead_count: 0,
      }
      setForms([formWithLeadCount, ...forms])
      setNewFormName("")
      setShowCreateDialog(false)
      
      // Обновляем лимит
      const info = await canCreateMoreForms(userId)
      setLimitInfo(info)
    }
    setCreating(false)
  }

  const handleDeleteForm = async () => {
    if (!selectedForm || !userId) return

    setDeleting(selectedForm.id)
    const result = await deleteUserForm(userId, selectedForm.id)

    if (result.error) {
      setError(result.error)
      setDeleting(null)
      return
    }

    setForms(forms.filter(f => f.id !== selectedForm.id))
    setShowDeleteDialog(false)
    setSelectedForm(null)
    setDeleting(null)

    // Обновляем лимит
    const info = await canCreateMoreForms(userId)
    setLimitInfo(info)
  }

  const updateFormName = async () => {
    if (!selectedForm) return

    const supabase = createClient()
    const { error } = await supabase.from("forms").update({ name: formName }).eq("id", selectedForm.id)

    if (!error) {
      setForms(forms.map(f => f.id === selectedForm.id ? { ...f, name: formName } : f))
      setShowEditDialog(false)
    }
  }

  const toggleFormActive = async (form: Form) => {
    const supabase = createClient()
    await supabase.from("forms").update({ is_active: !form.is_active }).eq("id", form.id)
    setForms(forms.map(f => f.id === form.id ? { ...f, is_active: !f.is_active } : f))
  }

  const copyFormLink = (form: Form) => {
    const link = `${window.location.origin}/form/${form.id}`
    navigator.clipboard.writeText(link)
    alert("Ссылка скопирована!")
  }

  const copyEmbedCode = () => {
    if (!selectedForm) return
    const embedCode = `<iframe src="${window.location.origin}/form/${selectedForm.id}" width="100%" height="700" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`
    navigator.clipboard.writeText(embedCode)
    alert("Код для встраивания скопирован!")
  }

  const openEditDialog = (form: Form) => {
    setSelectedForm(form)
    setFormName(form.name)
    setShowEditDialog(true)
  }

  const openEmbedDialog = (form: Form) => {
    setSelectedForm(form)
    setShowEmbedDialog(true)
  }

  const openDeleteDialog = (form: Form) => {
    setSelectedForm(form)
    setShowDeleteDialog(true)
  }

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  // Нет форм - показываем приглашение создать
  if (forms.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Форм пока нет</p>
          <p className="text-sm text-muted-foreground mb-6">Создайте форму для сбора лидов</p>
          {error && (
            <Alert variant="destructive" className="mb-4 max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={() => setShowCreateDialog(true)} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" />
            Создать форму
          </Button>
          
          {/* Диалог создания */}
          <CreateFormDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            newFormName={newFormName}
            setNewFormName={setNewFormName}
            onCreate={createForm}
            creating={creating}
          />
        </CardContent>
      </Card>
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
        </div>
        {(limitInfo?.canCreate || isUnlimited) && (
          <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Новая форма
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
          // Используем реальное количество лидов для отображения статистики
          const actualLeads = form.actual_lead_count ?? form.lead_count
          const progressPercent = (actualLeads / form.lead_limit) * 100
          const isLimitReached = actualLeads >= form.lead_limit

          return (
            <Card key={form.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg truncate">{form.name}</CardTitle>
                    <CardDescription className="text-xs font-mono truncate">
                      {form.id}
                    </CardDescription>
                  </div>
                  <Badge variant={form.is_active ? "default" : "secondary"} className="shrink-0 text-xs w-fit self-start sm:self-auto">
                    {form.is_active ? "Активна" : "Неактивна"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {/* Прогресс лидов */}
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="text-muted-foreground">Лиды</span>
                    <span className={isLimitReached ? "text-destructive font-medium" : ""}>
                      {actualLeads} / {form.lead_limit}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isLimitReached ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {isLimitReached && (
                  <p className="text-xs text-destructive">
                    Лимит исчерпан
                  </p>
                )}

                {/* Действия */}
                <div className="flex flex-wrap gap-2">
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
        creating={creating}
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
            <DialogDescription className="text-sm">Измените название вашей формы</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="formName">Название формы</Label>
              <Input id="formName" value={formName} onChange={(e) => setFormName(e.target.value)} className="mt-2 h-10 sm:h-11" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={updateFormName} className="flex-1 h-10 sm:h-11">
                Сохранить
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
              disabled={deleting === selectedForm?.id}
              className="w-full sm:w-auto h-10 sm:h-11"
            >
              {deleting === selectedForm?.id ? (
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
