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
import { Trash2, ExternalLink, Mail, Phone, Calendar, FileText, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react"
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
  const [isResultExpanded, setIsResultExpanded] = useState(false)
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto subtle-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4 pr-8">
              <span className="truncate">{lead.email || t("leads.noEmail")}</span>
              <Badge className={`shrink-0 ${statusColors[status]}`}>
                {getStatusLabel(status)}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {t("leads.detail.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Первая строка: Статус, Дата, Форма */}
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
              {/* Статус */}
              <div className="space-y-1">
                <Label className="text-xs">{t("leads.table.status")}</Label>
                <Select value={status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">{t("leads.leadStatus.todo")}</SelectItem>
                    <SelectItem value="in_progress">{t("leads.leadStatus.inProgress")}</SelectItem>
                    <SelectItem value="done">{t("leads.leadStatus.done")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Дата */}
              <div className="space-y-1">
                <Label className="text-xs">{t("leads.table.date")}</Label>
                <div className="flex items-center gap-1.5 text-xs h-8 px-2.5 border rounded-md bg-muted/50">
                  <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{new Date(lead.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Форма */}
              {formName && (
                <div className="space-y-1">
                  <Label className="text-xs">{t("leads.table.form")}</Label>
                  <div className="flex items-center gap-1.5 text-xs h-8 px-2.5 border rounded-md bg-muted/50">
                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{formName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Данные формы (Email, URL, телефон, custom_fields) */}
            {(() => {
              // Собираем все данные формы
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

              return formDataEntries.length > 0 ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("leads.detail.formData")}</Label>
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {formDataEntries.map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{formatKey(key, t, formFields, lead.form_id)}</Label>
                        {key === 'email' ? (
                          <a
                            href={`mailto:${value}`}
                            className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors h-8 px-2.5 border rounded-md bg-muted/50"
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{String(value)}</span>
                          </a>
                        ) : key === 'phone' ? (
                          <a
                            href={`tel:${value}`}
                            className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors h-8 px-2.5 border rounded-md bg-muted/50"
                          >
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{String(value)}</span>
                          </a>
                        ) : key === 'url' || key === 'parent_page_url' || isUrl(value) ? (
                          <a
                            href={String(value)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors h-8 px-2.5 border rounded-md bg-muted/50"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">{String(value)}</span>
                          </a>
                        ) : (
                          <div className="flex items-center text-xs h-8 px-2.5 border rounded-md bg-muted/50">
                            <span className="truncate">{formatValue(value)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            })()}

            {/* Третья строка: Заметка */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("leads.detail.notes")}</Label>
                {isNoteSaving && (
                  <span className="text-xs text-muted-foreground">{t("common.saving")}</span>
                )}
              </div>
              <Textarea
                placeholder={t("leads.detail.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[60px] text-xs resize-none"
              />
            </div>

            {/* Результат (сворачиваемый) */}
            <div className="space-y-1.5 pt-2 border-t">
              <button
                onClick={() => setIsResultExpanded(!isResultExpanded)}
                className="flex items-center justify-between w-full text-left hover:opacity-70 transition-opacity"
              >
                <Label className="text-xs cursor-pointer flex items-center gap-2 font-medium">
                  {t("leads.table.result")}
                  {lead.result_image_url && <ImageIcon className="h-3 w-3 text-muted-foreground" />}
                </Label>
                {isResultExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {isResultExpanded && (
                <div className="rounded-lg border bg-muted/30 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {lead.result_image_url && !imageError && (
                    <div className="mb-3">
                      <img
                        src={lead.result_image_url}
                        alt="Result"
                        className="rounded-lg max-h-[300px] w-full object-contain bg-background"
                        onError={() => setImageError(true)}
                        loading="lazy"
                      />
                    </div>
                  )}
                  {lead.result_image_url && imageError && (
                    <div className="mb-3 p-4 border-2 border-dashed rounded-lg text-center bg-muted/50">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs font-medium text-foreground mb-1">{t("leads.detail.imageError")}</p>
                      <p className="text-xs text-muted-foreground mb-3">{t("leads.detail.imageExpired")}</p>
                      <a
                        href={lead.result_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t("leads.detail.openInNewTab")}
                      </a>
                    </div>
                  )}
                  {lead.result_text ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MarkdownRenderer content={lead.result_text} />
                    </div>
                  ) : !lead.result_image_url ? (
                    <span className="text-sm text-muted-foreground">-</span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Действия */}
            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteLeadMutation.isPending}
                className="h-7 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </>
  )
}
