/**
 * LeadsTable - Компонент для отображения и управления лидами
 * Поддерживает просмотр лидов по всем формам пользователя с фильтрацией
 * 
 * Использует React Query для кэширования данных
 */
"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Download, Filter, AlertCircle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useLeads, useDeleteLead } from "@/lib/hooks"
import { useTranslation } from "@/lib/i18n"

interface LeadsTableProps {
  formId?: string
}

export function LeadsTable({ formId: propFormId }: LeadsTableProps) {
  const { t } = useTranslation()
  const [selectedFormId, setSelectedFormId] = useState<string | "all">("all")
  const { confirm, ConfirmDialog } = useConfirm()
  
  // React Query хуки
  const { data, isLoading, error } = useLeads(propFormId)
  const deleteLeadMutation = useDeleteLead()

  const leads = data?.leads || []
  const forms = data?.forms || []
  const isSuperAdmin = data?.isSuperAdmin || false

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
    const escapeCsvValue = (value: string): string => {
      if (value === null || value === undefined) return ""
      const str = String(value)
      // Если содержит запятую, кавычки или перенос строки, оборачиваем в кавычки и удваиваем кавычки внутри
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    
    const csv = [
      [t("leads.table.url"), t("leads.table.email"), t("leads.table.status"), t("leads.table.date"), t("leads.table.result"), t("leads.table.form")],
      ...dataToExport.map((lead) => [
        escapeCsvValue(lead.url),
        escapeCsvValue(lead.email || ""),
        escapeCsvValue(lead.status),
        escapeCsvValue(new Date(lead.created_at).toLocaleString()),
        escapeCsvValue(lead.result_text || lead.result_image_url || ""),
        escapeCsvValue(forms.find(f => f.id === lead.form_id)?.name || ""),
      ]),
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
    // Очищаем URL после использования
    setTimeout(() => window.URL.revokeObjectURL(url), 100)
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
          {/* Фильтр по формам (если есть несколько форм или superadmin) */}
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
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={(forms.length > 1 || isSuperAdmin) && !propFormId ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  {t("leads.noLeads")}
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium max-w-[150px] truncate text-xs sm:text-sm">{lead.url}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{lead.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={lead.status === "completed" ? "default" : "outline"} className="text-xs">
                      {lead.status === "completed" ? t("leads.status.completed") : t("leads.status.processing")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate text-xs sm:text-sm">
                    {lead.result_image_url ? (
                      <a
                        href={lead.result_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {t("leads.image")}
                      </a>
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
                      onClick={() => handleDelete(lead.id)} 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      disabled={deleteLeadMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {ConfirmDialog}
    </div>
  )
}
