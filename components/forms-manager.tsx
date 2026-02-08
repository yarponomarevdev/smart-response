/**
 * FormsManager - Компонент управления формами пользователя
 * Поддерживает создание множества форм для админов, удаление форм,
 * настройку и встраивание форм на сайты
 * 
 * Использует React Query для кэширования данных
 * Создание формы происходит в один клик без модального окна
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy, ExternalLink, Code2, AlertCircle, Plus, Loader2, Trash2, FileEdit } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InlineEditableText } from "@/components/ui/inline-editable-text"
import { toast } from "sonner"
import {
  useUserForms,
  useCreateForm,
  useDeleteForm,
  useToggleFormActive,
  useUpdateFormName,
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
  const updateFormNameMutation = useUpdateFormName()

  // Локальное состояние для UI
  const [error, setError] = useState<string | null>(null)
  
  // Диалоги
  const [showEmbedDialog, setShowEmbedDialog] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null)
  
  // Текущая форма для редактирования
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)

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

  // Создание формы в один клик
  const handleCreateForm = async () => {
    setError(null)
    try {
      await createFormMutation.mutateAsync(t("forms.defaultName"))
      toast.success(t("forms.toast.created"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.savingFailed"))
    }
  }

  const handleDelete = async (formId: string) => {
    try {
      await deleteFormMutation.mutateAsync(formId)
      toast.success(t("forms.toast.deleted"))
      setShowConfirmDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.savingFailed"))
    }
  }

  const toggleFormActive = async (form: Form) => {
    try {
      await toggleActiveMutation.mutateAsync({ formId: form.id, currentIsActive: form.is_active })
    } catch (err) {
      if (err instanceof Error && err.name === "CANNOT_PUBLISH_EMPTY_FORM") {
        setError(t("errors.cannotPublishEmptyForm"))
      } else {
        setError(err instanceof Error ? err.message : t("errors.savingFailed"))
      }
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

  const handleFormNameUpdate = async (formId: string, newName: string) => {
    if (!newName.trim()) {
      throw new Error(t("forms.toast.nameError"))
    }
    if (newName.length > 30) {
      throw new Error(t("forms.toast.nameError"))
    }
    
    try {
      await updateFormNameMutation.mutateAsync({
        formId,
        name: newName.trim()
      })
      toast.success(t("forms.toast.updated"))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.savingFailed"))
      throw err
    }
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
          const isTemporary = form.id.startsWith("temp-")
          
          // Skeleton карточка для создаваемой формы
          if (isTemporary) {
            return (
              <Card key={form.id} className="relative overflow-hidden animate-pulse">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </CardContent>
                {/* Overlay с индикатором */}
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                  <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg shadow-sm border">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">{t("forms.creating")}</span>
                  </div>
                </div>
              </Card>
            )
          }
          
          return (
            <Card key={form.id} className="relative overflow-hidden transition-all duration-200">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Badge variant={form.is_active ? "default" : "secondary"} className="shrink-0 text-xs whitespace-nowrap">
                        {form.is_active ? t("forms.active") : t("forms.inactive")}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg">
                        <InlineEditableText
                          value={form.name}
                          onSave={(newValue) => handleFormNameUpdate(form.id, newValue)}
                          placeholder={t("forms.createDialog.namePlaceholder")}
                          emptyText={t("forms.clickToEdit")}
                          className="font-semibold"
                          inputClassName="h-8 text-base sm:text-lg font-semibold"
                          maxLength={30}
                          showCharCount={true}
                        />
                      </CardTitle>
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
                      {showConfirmDelete === form.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 sm:h-9 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirmDelete(null)}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 sm:h-9 px-2"
                            onClick={() => handleDelete(form.id)}
                            disabled={deleteFormMutation.isPending}
                          >
                            {deleteFormMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              t("common.delete")
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 sm:h-9"
                          onClick={() => setShowConfirmDelete(form.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {t("forms.created")}: {new Date(form.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
          )
        })}
        {(limitInfo?.canCreate || isUnlimited) && (
          <button
            onClick={handleCreateForm}
            disabled={createFormMutation.isPending}
            className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 min-h-[250px] group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createFormMutation.isPending ? (
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </div>
                <span className="font-medium text-muted-foreground group-hover:text-primary transition-colors">
                  {t("forms.createForm")}
                </span>
              </>
            )}
          </button>
        )}
      </div>

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

      {/* Диалог удаления удален, так как используется inline подтверждение */}
    </div>
  )
}
