/**
 * LeadsView - Компонент для отображения и управления лидами
 * Поддерживает два режима отображения: таблица и карточки
 * 
 * Использует React Query для кэширования данных
 */
"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Download, Filter, AlertCircle, LayoutGrid, List } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useLeads, useDeleteLead, type Lead, type LeadStatus } from "@/lib/hooks"
import { useTranslation } from "@/lib/i18n"
import { LeadCard } from "./lead-card"
import { LeadDetailModal } from "./lead-detail-modal"

interface LeadsViewProps {
  formId?: string
}

type ViewMode = "table" | "cards"

const VIEW_MODE_KEY = "leads-view-mode"

const statusColors: Record<LeadStatus, string> = {
  todo: "bg-gray-500/10 text-gray-500",
  in_progress: "bg-yellow-500/10 text-yellow-600",
  done: "bg-green-500/10 text-green-600",
}

export function LeadsView({ formId: propFormId }: LeadsViewProps) {
  const { t } = useTranslation()
  const [selectedFormId, setSelectedFormId] = useState<string | "all">("all")
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()
  
  // React Query хуки
  const { data, isLoading, error } = useLeads(propFormId)
  const deleteLeadMutation = useDeleteLead()

  const leads = data?.leads || []
  const forms = data?.forms || []
  const isSuperAdmin = data?.isSuperAdmin || false

  // Загружаем сохранённый режим отображения
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY)
    if (saved === "table" || saved === "cards") {
      setViewMode(saved)
    }
  }, [])

  // Сохраняем режим отображения
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t("leads.deleteDialog.title"),
      description: t("leads.deleteDialog.description"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      variant: "destructive"
    })

    if (!confirmed) return

    try {
      await deleteLeadMutation.mutateAsync(id)
      toast.success(t("leads.toast.deleted"))
    } catch (err) {
      console.error("Ошибка удаления лида:", err)
      toast.error(t("leads.toast.deleteError") + ": " + (err instanceof Error ? err.message : t("errors.networkError")))
    }
  }

  const handleExport = () => {
    const dataToExport = filteredLeads
    
    // Экранирование значений для CSV
    const escapeCsvValue = (value: unknown): string => {
      if (value === null || value === undefined) return ""
      if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
      if (Array.isArray(value)) return value.join(', ')
      if (typeof value === 'object') return JSON.stringify(value)
      const str = String(value)
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    
    // Собираем все уникальные ключи custom_fields (кроме phone и requestFeedback)
    const customFieldKeys = new Set<string>()
    dataToExport.forEach(lead => {
      if (lead.custom_fields) {
        Object.keys(lead.custom_fields).forEach(key => {
          if (key !== 'phone' && key !== 'requestFeedback') {
            customFieldKeys.add(key)
          }
        })
      }
    })
    const customKeys = Array.from(customFieldKeys)
    
    // Форматирование ключа для заголовка
    const formatKey = (key: string): string => {
      return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/^\w/, c => c.toUpperCase())
    }
    
    // Базовые заголовки
    const baseHeaders = [
      t("leads.table.email"), 
      t("leads.detail.phone"), 
      t("leads.table.url")
    ]
    
    // Динамические заголовки
    const dynamicHeaders = customKeys.map(key => formatKey(key))
    
    // Финальные заголовки
    const finalHeaders = [
      ...baseHeaders,
      ...dynamicHeaders,
      t("leads.table.status"), 
      t("leads.table.date"), 
      t("leads.table.result"), 
      t("leads.table.form"), 
      t("leads.detail.notes")
    ]
    
    const csv = [
      finalHeaders,
      ...dataToExport.map((lead) => {
        // Базовые значения
        const baseValues = [
          escapeCsvValue(lead.email || ""),
          escapeCsvValue((lead.custom_fields?.phone as string) || ""),
          escapeCsvValue(lead.url || ""),
        ]
        
        // Динамические значения
        const dynamicValues = customKeys.map(key => 
          escapeCsvValue(lead.custom_fields?.[key])
        )
        
        // Финальные значения
        return [
          ...baseValues,
          ...dynamicValues,
          escapeCsvValue(getStatusLabel(lead.lead_status || 'todo')),
          escapeCsvValue(new Date(lead.created_at).toLocaleString()),
          escapeCsvValue(lead.result_text || lead.result_image_url || ""),
          escapeCsvValue(forms.find(f => f.id === lead.form_id)?.name || ""),
          escapeCsvValue(lead.notes || ""),
        ]
      }),
    ]
      .map((row) => row.join(","))
      .join("\n")

    // Добавляем BOM для правильного отображения кириллицы в Excel
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => window.URL.revokeObjectURL(url), 100)
  }

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead)
    setModalOpen(true)
  }

  // Фильтрация лидов по выбранной форме
  const filteredLeads = selectedFormId === "all" 
    ? leads 
    : leads.filter(lead => lead.form_id === selectedFormId)

  // Получаем название формы по ID
  const getFormName = (formId: string | null) => {
    if (!formId) return "-"
    return forms.find(f => f.id === formId)?.name || formId.slice(0, 8)
  }

  const getStatusLabel = (status: LeadStatus) => {
    switch (status) {
      case "todo": return t("leads.leadStatus.todo")
      case "in_progress": return t("leads.leadStatus.inProgress")
      case "done": return t("leads.leadStatus.done")
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">{t("leads.loading")}</div>
  }

  if (error) {
    return (
      <div className="py-4">
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium mb-2">{t("errors.loadingFailed")}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{t("leads.title")}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {filteredLeads.length} {selectedFormId === "all" ? t("leads.inTotal") : t("leads.inSelectedForm")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Переключатель вида */}
          <div className="flex items-center border rounded-lg overflow-hidden h-9">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-full px-3"
              onClick={() => handleViewModeChange("cards")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-full px-3"
              onClick={() => handleViewModeChange("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Фильтр по формам */}
          {(forms.length > 1 || isSuperAdmin) && !propFormId && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                <SelectTrigger className="h-9 w-full sm:w-[200px]">
                  <SelectValue placeholder={t("leads.selectForm")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("leads.allForms")} ({leads.length})</SelectItem>
                  {forms.map((form) => {
                    const count = leads.filter(l => l.form_id === form.id).length
                    return (
                      <SelectItem key={form.id} value={form.id}>
                        {form.name} ({count})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleExport} variant="outline" disabled={filteredLeads.length === 0} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t("leads.exportCSV")}</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>
      </div>

      {/* Контент */}
      {filteredLeads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t("leads.noLeads")}
        </div>
      ) : viewMode === "cards" ? (
        /* Карточный вид */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              formName={(forms.length > 1 || isSuperAdmin) && !propFormId ? getFormName(lead.form_id) : undefined}
              onClick={() => handleLeadClick(lead)}
            />
          ))}
        </div>
      ) : (
        /* Табличный вид */
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">{t("leads.table.url")}</TableHead>
                <TableHead className="min-w-[120px]">{t("leads.table.email")}</TableHead>
                <TableHead className="min-w-[100px]">{t("leads.table.status")}</TableHead>
                <TableHead className="min-w-[150px]">{t("leads.table.result")}</TableHead>
                {(forms.length > 1 || isSuperAdmin) && !propFormId && <TableHead className="min-w-[100px]">{t("leads.table.form")}</TableHead>}
                <TableHead className="min-w-[100px]">{t("leads.table.date")}</TableHead>
                <TableHead className="text-right min-w-[80px]">{t("leads.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow 
                  key={lead.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleLeadClick(lead)}
                >
                  <TableCell className="font-medium max-w-[150px] truncate text-xs sm:text-sm">{lead.url}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{lead.email || "-"}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${statusColors[lead.lead_status || 'todo']}`}>
                      {getStatusLabel(lead.lead_status || 'todo')}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate text-xs sm:text-sm">
                    {lead.result_image_url ? (
                      <span className="text-blue-500">{t("leads.image")}</span>
                    ) : lead.result_text ? (
                      <span className="text-xs">{lead.result_text.substring(0, 50)}...</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  {(forms.length > 1 || isSuperAdmin) && !propFormId && (
                    <TableCell className="text-xs sm:text-sm text-muted-foreground">
                      {getFormName(lead.form_id)}
                    </TableCell>
                  )}
                  <TableCell className="text-xs sm:text-sm">{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(lead.id)
                      }} 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      disabled={deleteLeadMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Модальное окно с деталями */}
      <LeadDetailModal
        lead={selectedLead}
        formName={selectedLead ? getFormName(selectedLead.form_id) : undefined}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {ConfirmDialog}
    </div>
  )
}
