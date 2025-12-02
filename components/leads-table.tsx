/**
 * LeadsTable - Компонент для отображения и управления лидами
 * Поддерживает просмотр лидов по всем формам пользователя с фильтрацией
 */
"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Download, Filter } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Lead {
  id: string
  url: string
  email: string
  result_text: string | null
  result_image_url: string | null
  status: string
  created_at: string
  form_id: string | null
}

interface Form {
  id: string
  name: string
}

interface LeadsTableProps {
  formId?: string
}

export function LeadsTable({ formId: propFormId }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string | "all">("all")
  const [isLoading, setIsLoading] = useState(true)

  const fetchFormsAndLeads = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    // Если передан конкретный formId (суперадмин), показываем только его лиды
    if (propFormId) {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("form_id", propFormId)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setLeads(data)
      }
      setIsLoading(false)
      return
    }

    // Загружаем все формы пользователя
    const { data: userForms } = await supabase
      .from("forms")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })

    if (userForms && userForms.length > 0) {
      setForms(userForms)
      
      // Загружаем лиды по всем формам пользователя
      const formIds = userForms.map(f => f.id)
      const { data: leadsData, error } = await supabase
        .from("leads")
        .select("*")
        .in("form_id", formIds)
        .order("created_at", { ascending: false })

      if (!error && leadsData) {
        setLeads(leadsData)
      }
    }
    
    setIsLoading(false)
  }, [propFormId])

  useEffect(() => {
    fetchFormsAndLeads()
  }, [fetchFormsAndLeads])

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот лид?")) return

    const supabase = createClient()
    const { error } = await supabase.from("leads").delete().eq("id", id)

    if (!error) {
      setLeads(leads.filter((lead) => lead.id !== id))
    }
  }

  const handleExport = () => {
    const dataToExport = filteredLeads
    const csv = [
      ["URL", "Email", "Статус", "Дата", "Результат", "Форма"],
      ...dataToExport.map((lead) => [
        lead.url,
        lead.email || "",
        lead.status,
        new Date(lead.created_at).toLocaleString("ru-RU"),
        lead.result_text || lead.result_image_url || "",
        forms.find(f => f.id === lead.form_id)?.name || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
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
    return <div className="text-center py-8">Загрузка лидов...</div>
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Лиды</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {filteredLeads.length} {selectedFormId === "all" ? "всего" : "в выбранной форме"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Фильтр по формам (только если есть несколько форм) */}
          {forms.length > 1 && !propFormId && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                <SelectTrigger className="h-9 w-full sm:w-[200px]">
                  <SelectValue placeholder="Выберите форму" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все формы ({leads.length})</SelectItem>
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
            <span className="hidden sm:inline">Экспорт CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">URL</TableHead>
              <TableHead className="min-w-[120px]">Email</TableHead>
              <TableHead className="min-w-[100px]">Статус</TableHead>
              <TableHead className="min-w-[150px]">Результат</TableHead>
              {forms.length > 1 && !propFormId && <TableHead className="min-w-[100px]">Форма</TableHead>}
              <TableHead className="min-w-[100px]">Дата</TableHead>
              <TableHead className="text-right min-w-[80px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={forms.length > 1 && !propFormId ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  Лидов пока нет
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium max-w-[150px] truncate text-xs sm:text-sm">{lead.url}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{lead.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={lead.status === "completed" ? "default" : "outline"} className="text-xs">
                      {lead.status === "completed" ? "Завершен" : "В обработке"}
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
                        Картинка
                      </a>
                    ) : lead.result_text ? (
                      <span className="text-xs">{lead.result_text.substring(0, 50)}...</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  {forms.length > 1 && !propFormId && (
                    <TableCell className="text-xs sm:text-sm text-muted-foreground">
                      {getFormName(lead.form_id)}
                    </TableCell>
                  )}
                  <TableCell className="text-xs sm:text-sm">{new Date(lead.created_at).toLocaleDateString("ru-RU")}</TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => handleDelete(lead.id)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
