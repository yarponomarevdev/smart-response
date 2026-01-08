/**
 * LeadCard - Карточка лида для grid-вида
 * Компактное превью с основной информацией, клик открывает модальное окно
 */
"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Calendar, Image as ImageIcon } from "lucide-react"
import type { Lead, LeadStatus } from "@/lib/hooks/use-leads"
import { useTranslation } from "@/lib/i18n"

interface LeadCardProps {
  lead: Lead
  formName?: string
  onClick: () => void
}

const statusColors: Record<LeadStatus, string> = {
  todo: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20",
  done: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
}

// Служебные поля, которые не нужно показывать в списке
const HIDDEN_FIELDS = ['phone', 'requestFeedback']

// Форматирование ключа: "field_name" -> "Field name"
const formatKey = (key: string): string => {
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
  const str = String(value)
  // Убираем протокол для URL
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str.replace(/^https?:\/\//, '').substring(0, 30) + (str.length > 40 ? '...' : '')
  }
  return str.length > 40 ? str.substring(0, 40) + '...' : str
}

export function LeadCard({ lead, formName, onClick }: LeadCardProps) {
  const { t } = useTranslation()

  const getStatusLabel = (status: LeadStatus) => {
    switch (status) {
      case "todo":
        return t("leads.leadStatus.todo")
      case "in_progress":
        return t("leads.leadStatus.inProgress")
      case "done":
        return t("leads.leadStatus.done")
    }
  }

  const hasResult = lead.result_text || lead.result_image_url

  // Собираем все отображаемые поля
  const displayFields: [string, unknown][] = []
  
  // Добавляем URL если есть
  if (lead.url) {
    displayFields.push(['url', lead.url])
  }
  
  // Добавляем custom_fields (кроме служебных)
  if (lead.custom_fields) {
    Object.entries(lead.custom_fields)
      .filter(([key]) => !HIDDEN_FIELDS.includes(key))
      .forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          displayFields.push([key, value])
        }
      })
  }

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20 group"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Email и статус */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{lead.email || "-"}</span>
          </div>
          <Badge className={`shrink-0 text-xs ${statusColors[lead.lead_status || 'todo']}`}>
            {getStatusLabel(lead.lead_status || 'todo')}
          </Badge>
        </div>

        {/* Динамические поля */}
        {displayFields.length > 0 && (
          <div className="space-y-1">
            {displayFields.slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium shrink-0">{formatKey(key)}:</span>
                <span className="truncate">{formatValue(value)}</span>
              </div>
            ))}
            {displayFields.length > 3 && (
              <span className="text-xs text-muted-foreground/70">
                +{displayFields.length - 3} {t("leads.moreFields")}
              </span>
            )}
          </div>
        )}

        {/* Результат (превью) */}
        {hasResult && (
          <div className="text-xs text-muted-foreground">
            {lead.result_image_url ? (
              <div className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                <span>{t("leads.image")}</span>
              </div>
            ) : lead.result_text ? (
              <p className="line-clamp-2">{lead.result_text.substring(0, 100)}...</p>
            ) : null}
          </div>
        )}

        {/* Нижняя строка: форма и дата */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          {formName && (
            <span className="truncate max-w-[120px]">{formName}</span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <Calendar className="h-3 w-3" />
            <span>{new Date(lead.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
