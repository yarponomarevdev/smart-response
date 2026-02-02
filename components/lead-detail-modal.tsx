/**
 * LeadDetailModal - Модальное окно с детальной информацией о лиде
 * Позволяет просматривать все данные, менять статус и добавлять заметки
 */
"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, ExternalLink, Mail, Phone, FileText, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"
import type { Lead, LeadStatus, FormField } from "@/lib/hooks/use-leads"
import { useUpdateLead, useDeleteLead } from "@/lib/hooks"
import { useTranslation } from "@/lib/i18n"
import { MarkdownRenderer } from "@/components/markdown-renderer"

interface LeadDetailModalProps {
  lead: Lead | null
  formName?: string
  formFields: FormField[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusColors: Record<LeadStatus, string> = {
  todo: "bg-gray-500/10 text-gray-500",
  in_progress: "bg-yellow-500/10 text-yellow-600",
  done: "bg-green-500/10 text-green-600",
}

// Служебные поля, которые не нужно показывать в списке
const HIDDEN_FIELDS = ['phone', 'requestFeedback']

// Форматирование ключа: использует label из метаданных полей или fallback на форматирование
const formatKey = (key: string, t: (key: string) => string, formFields: FormField[], formId: string | null): string => {
  // Специальные ключи с понятными названиями
  const keyMap: Record<string, string> = {
    email: 'Email',
    phone: t("leads.detail.phone"),
    url: 'URL',
    parent_page_url: t("leads.detail.integrationSite"),
  }
  if (keyMap[key]) return keyMap[key]
  
  // Ищем метаданные поля в formFields
  if (formId) {
    const field = formFields.find(f => f.form_id === formId && f.field_id === key)
    if (field?.label) return field.label
  }
  
  // Fallback: форматируем ключ
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^\w/, c => c.toUpperCase())
}

// Форматирование значения в зависимости от типа
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Проверка, является ли значение URL
const isUrl = (value: unknown): boolean => {
  if (typeof value !== 'string') return false
  return value.startsWith('http://') || value.startsWith('https://')
}

export function LeadDetailModal({ lead, formName, formFields, open, onOpenChange }: LeadDetailModalProps) {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirm()
  const updateLeadMutation = useUpdateLead()
  const deleteLeadMutation = useDeleteLead()
  
  const [notes, setNotes] = useState(lead?.notes || "")
  const [status, setStatus] = useState<LeadStatus>(lead?.lead_status || "todo")
  const [isNoteSaving, setIsNoteSaving] = useState(false)
  const [imageError, setImageError] = useState(false)
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousNotesRef = useRef<string>("")

  // Обновляем локальное состояние при изменении lead
  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || "")
      setStatus(lead.lead_status || "todo")
      previousNotesRef.current = lead.notes || ""
      setImageError(false) // Сбрасываем ошибку изображения при смене лида
    }
  }, [lead])

  // Автосохранение заметок с debounce
  useEffect(() => {
    // Очищаем предыдущий таймаут
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current)
    }

    // Если заметки не изменились, не сохраняем
    if (notes === previousNotesRef.current || !lead) {
      return
    }

    // Устанавливаем таймаут для автосохранения
    notesTimeoutRef.current = setTimeout(async () => {
      setIsNoteSaving(true)
      try {
        await updateLeadMutation.mutateAsync({ leadId: lead.id, notes })
        previousNotesRef.current = notes
      } catch (err) {
        console.error("Ошибка сохранения заметки:", err)
      } finally {
        setIsNoteSaving(false)
      }
    }, 1000) // 1 секунда debounce

    // Очистка при размонтировании
    return () => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current)
      }
    }
  }, [notes, lead, updateLeadMutation])

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return
    setStatus(newStatus)
    try {
      await updateLeadMutation.mutateAsync({ leadId: lead.id, lead_status: newStatus })
      toast.success(t("leads.toast.statusUpdated"))
    } catch (err) {
      toast.error(t("leads.toast.statusError"))
      setStatus(lead.lead_status || "todo")
    }
  }

  const handleDelete = async () => {
    if (!lead) return
    
    const confirmed = await confirm({
      title: t("leads.deleteDialog.title"),
      description: t("leads.deleteDialog.description"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      variant: "destructive"
    })

    if (!confirmed) return

    try {
      await deleteLeadMutation.mutateAsync(lead.id)
      toast.success(t("leads.toast.deleted"))
      onOpenChange(false)
    } catch (err) {
      toast.error(t("leads.toast.deleteError"))
    }
  }

  const getStatusLabel = (s: LeadStatus) => {
    switch (s) {
      case "todo": return t("leads.leadStatus.todo")
      case "in_progress": return t("leads.leadStatus.inProgress")
      case "done": return t("leads.leadStatus.done")
    }
  }

  // Извлекаем телефон из custom_fields
  const phone = lead?.custom_fields?.phone as string | undefined

  if (!lead) return null

  // Подготовка данных формы для отображения
  const formDataEntries: [string, unknown][] = []
  
  // Email всегда первым
  if (lead.email) {
    formDataEntries.push(['email', lead.email])
  }
  
  // Телефон из custom_fields
  if (phone) {
    formDataEntries.push(['phone', phone])
  }
  
  // parent_page_url с приоритетом над обычным URL
  const parentPageUrl = lead.custom_fields?.parent_page_url as string | undefined
  if (parentPageUrl) {
    formDataEntries.push(['parent_page_url', parentPageUrl])
  } else if (lead.url) {
    // Показываем обычный URL только если нет parent_page_url
    formDataEntries.push(['url', lead.url])
  }
  
  // Остальные custom_fields (кроме служебных и уже обработанных)
  if (lead.custom_fields) {
    Object.entries(lead.custom_fields)
      .filter(([key]) => !HIDDEN_FIELDS.includes(key) && key !== 'parent_page_url')
      .forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formDataEntries.push([key, value])
        }
      })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="sm:max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden sm:rounded-xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-6 border-b shrink-0 bg-background z-10">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-semibold break-all">
                  {lead.email || t("leads.noEmail")}
                </DialogTitle>
                <DialogDescription>
                  ID: {lead.id.slice(0, 8)}... • {new Date(lead.created_at).toLocaleString()}
                </DialogDescription>
              </div>
              <Badge className={`shrink-0 ${statusColors[status]} px-3 py-1 text-sm capitalize`}>
                {getStatusLabel(status)}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
            {/* Сайдбар (Мета-информация и заметки) */}
            <div className="w-full md:w-[320px] shrink-0 overflow-y-auto p-6 bg-muted/10 flex flex-col gap-6">
              {/* Статус */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{t("leads.table.status")}</Label>
                <Select value={status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">{t("leads.leadStatus.todo")}</SelectItem>
                    <SelectItem value="in_progress">{t("leads.leadStatus.inProgress")}</SelectItem>
                    <SelectItem value="done">{t("leads.leadStatus.done")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Форма */}
              {formName && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{t("leads.table.form")}</Label>
                  <div className="flex items-center gap-2 text-sm font-medium p-2.5 border rounded-md bg-background">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{formName}</span>
                  </div>
                </div>
              )}

              {/* Заметка */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{t("leads.detail.notes")}</Label>
                  {isNoteSaving && (
                    <span className="text-xs text-muted-foreground animate-pulse">{t("common.saving")}</span>
                  )}
                </div>
                <Textarea
                  placeholder={t("leads.detail.notesPlaceholder")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[120px] text-sm resize-none bg-background focus-visible:ring-1"
                />
              </div>

              {/* Кнопка удаления */}
              <div className="pt-4 mt-auto border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteLeadMutation.isPending}
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("leads.deleteDialog.title")}
                </Button>
              </div>
            </div>

            {/* Основной контент */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background">
              {/* Данные формы */}
              {formDataEntries.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("leads.detail.formData")}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-y-4 gap-x-8">
                    {formDataEntries.map(([key, value]) => (
                      <div key={key} className="group">
                        <dt className="text-xs text-muted-foreground mb-1">
                          {formatKey(key, t, formFields, lead.form_id)}
                        </dt>
                        <dd className="text-sm font-medium break-words leading-relaxed">
                          {key === 'email' ? (
                            <a href={`mailto:${value}`} className="text-primary hover:underline inline-flex items-center gap-1">
                              {String(value)} <ExternalLink className="h-3 w-3 opacity-50" />
                            </a>
                          ) : key === 'phone' ? (
                            <a href={`tel:${value}`} className="text-primary hover:underline inline-flex items-center gap-1">
                              {String(value)} <Phone className="h-3 w-3 opacity-50" />
                            </a>
                          ) : (key === 'url' || key === 'parent_page_url' || isUrl(value)) ? (
                            <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 break-all">
                              {String(value)} <ExternalLink className="h-3 w-3 opacity-50" />
                            </a>
                          ) : (
                            formatValue(value)
                          )}
                        </dd>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Результат */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Badge variant="outline" className="h-5 px-1.5 rounded-sm">AI</Badge>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("leads.table.result")}</h3>
                </div>

                <div>
                  {lead.result_image_url && !imageError && (
                    <div className="mb-6">
                      <img
                        src={lead.result_image_url}
                        alt="Result"
                        className="rounded-lg max-h-[400px] w-full object-contain bg-background border shadow-sm"
                        onError={() => setImageError(true)}
                        loading="lazy"
                      />
                    </div>
                  )}
                  
                  {lead.result_image_url && imageError && (
                    <div className="mb-6 p-6 border-2 border-dashed rounded-lg text-center bg-background">
                      <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground mb-1">{t("leads.detail.imageError")}</p>
                      <p className="text-xs text-muted-foreground mb-4">{t("leads.detail.imageExpired")}</p>
                      <a
                        href={lead.result_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t("leads.detail.openInNewTab")}
                      </a>
                    </div>
                  )}

                  {lead.result_text ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <MarkdownRenderer content={lead.result_text} />
                    </div>
                  ) : !lead.result_image_url ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>{t("leads.noResult") || "Результат отсутствует"}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </>
  )
}
