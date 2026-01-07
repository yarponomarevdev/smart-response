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
import { Copy, ExternalLink, Users, Code2, AlertCircle, Plus, Loader2, Trash2, FileEdit } from "lucide-react"
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
  useToggleFormActive,
} from "@/lib/hooks"
import { useTranslation } from "@/lib/i18n"

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
  const { t } = useTranslation()
  
  // React Query хуки
  const { data, isLoading, error: queryError } = useUserForms()
  const createFormMutation = useCreateForm()
  const deleteFormMutation = useDeleteForm()
  const toggleActiveMutation = useToggleFormActive()

  // Локальное состояние для UI
  const [error, setError] = useState<string | null>(null)
  
  // Диалоги
  const [showEmbedDialog, setShowEmbedDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  
  // Текущая форма для редактирования
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [newFormName, setNewFormName] = useState("")

  const forms = data?.forms || []
  const totalLeads = data?.totalLeads || 0
  const limitInfo = data?.limitInfo || null
  const maxLeads = data?.maxLeads ?? null

  // Проверяем ошибку перед проверкой загрузки
  if (queryError) {
    return (
      <div className="py-4">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium mb-2">{t("errors.loadingFailed")}</p>
          <p className="text-sm text-muted-foreground">{queryError.message}</p>
        </div>
      </div>
    )
  }

  // Показываем загрузку, если данные еще не загрузились
  if (isLoading || !data) {
    return <div className="text-center py-12">{t("common.loading")}</div>
  }

  const createForm = async () => {
    setError(null)
    if (newFormName.length > 30) {
      setError(t("forms.toast.nameError"))
      return
    }
    try {
      await createFormMutation.mutateAsync(newFormName || undefined)
      setNewFormName("")
      setShowCreateDialog(false)
      toast.success(t("forms.toast.created"))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.savingFailed"))
    }
  }

  const handleDeleteForm = async () => {
    if (!selectedForm) return

    try {
      await deleteFormMutation.mutateAsync(selectedForm.id)
      setShowDeleteDialog(false)
      setSelectedForm(null)
      toast.success(t("forms.toast.deleted"))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.savingFailed"))
    }
  }

  const toggleFormActive = async (form: Form) => {
    try {
      await toggleActiveMutation.mutateAsync({ formId: form.id, currentIsActive: form.is_active })
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.savingFailed"))
    }
  }

  const copyFormLink = (form: Form) => {
    const link = `${window.location.origin}/form/${form.id}`
    navigator.clipboard.writeText(link)
    toast.success(t("forms.toast.linkCopied"))
  }

  const copyEmbedCode = () => {
    if (!selectedForm) return
    const embedCode = `<iframe src="${window.location.origin}/form/${selectedForm.id}" width="100%" height="700" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`
    navigator.clipboard.writeText(embedCode)
    toast.success(t("forms.toast.codeCopied"))
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
          <p className="text-lg font-medium mb-2">{t("forms.noFormsYet")}</p>
          <p className="text-sm text-muted-foreground mb-6">{t("forms.noFormsDescription")}</p>
          {error && (
            <Alert variant="destructive" className="mb-4 max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={() => setShowCreateDialog(true)} disabled={createFormMutation.isPending} className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[18px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 text-sm sm:text-base">
            {t("forms.createForm")}
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
          <h2 className="text-xl sm:text-2xl font-bold">{t("forms.title")}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isUnlimited 
              ? `${t("forms.totalForms")}: ${limitInfo?.currentCount || forms.length}` 
              : `${t("forms.totalForms")}: ${limitInfo?.currentCount || forms.length} / ${limitInfo?.limit}`
            }
          </p>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("forms.totalResponses")}: {maxLeads === null 
              ? totalLeads 
              : `${totalLeads} / ${maxLeads}`
            }
          </p>
        </div>
        {(limitInfo?.canCreate || isUnlimited) && (
          <Button onClick={() => setShowCreateDialog(true)} className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[18px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 text-sm sm:text-base w-full sm:w-auto">
            {t("forms.createForm")}
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
                    {form.is_active ? t("forms.active") : t("forms.inactive")}
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
                    <span>{t("forms.editor")}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyFormLink(form)} className="text-xs sm:text-sm h-8 sm:h-9">
                    <Copy className="h-3 w-3 mr-1" />
                    <span>{t("forms.link")}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(`/form/${form.id}`, "_blank")} className="text-xs sm:text-sm h-8 sm:h-9">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    <span>{t("forms.open")}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEmbedDialog(form)} className="text-xs sm:text-sm h-8 sm:h-9">
                    <Code2 className="h-3 w-3 mr-1" />
                    <span>{t("forms.code")}</span>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleFormActive(form)}
                    disabled={toggleActiveMutation.isPending && toggleActiveMutation.variables?.formId === form.id}
                    className="text-xs sm:text-sm h-8 sm:h-9"
                  >
                    {toggleActiveMutation.isPending && toggleActiveMutation.variables?.formId === form.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      form.is_active ? t("forms.disable") : t("forms.enable")
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 sm:h-9"
                    onClick={() => openDeleteDialog(form)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t("forms.created")}: {new Date(form.created_at).toLocaleDateString()}
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
            <DialogTitle className="text-lg sm:text-xl">{t("forms.embedDialog.title")}</DialogTitle>
            <DialogDescription className="text-sm">{t("forms.embedDialog.description")}</DialogDescription>
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
                {t("forms.embedDialog.copyCode")}
              </Button>
              <Button variant="outline" onClick={() => setShowEmbedDialog(false)} className="h-10 sm:h-11">
                {t("common.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог удаления */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{t("forms.deleteDialog.title")}</DialogTitle>
            <DialogDescription className="text-sm">
              {t("forms.deleteDialog.description").replace("{name}", selectedForm?.name || "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="w-full sm:w-auto h-10 sm:h-11">
              {t("common.cancel")}
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
                  {t("common.delete")}...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("common.delete")}
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
  const { t } = useTranslation()
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{t("forms.createDialog.title")}</DialogTitle>
          <DialogDescription className="text-sm">
            {t("forms.createDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="newFormName">{t("forms.createDialog.nameLabel")}</Label>
            <Input 
              id="newFormName" 
              value={newFormName} 
              onChange={(e) => setNewFormName(e.target.value)} 
              placeholder={t("forms.createDialog.namePlaceholder")}
              className="mt-2 h-10 sm:h-11" 
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {newFormName.length}/30 {t("forms.createDialog.characters")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={onCreate} className="flex-1 h-10 sm:h-11" disabled={creating || !newFormName.trim() || newFormName.length > 30}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("forms.createDialog.creating")}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("forms.createDialog.create")}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 sm:h-11">
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
