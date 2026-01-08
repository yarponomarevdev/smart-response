/**
 * LeadCard - Карточка лида для grid-вида
 * Компактное превью с основной информацией, клик открывает модальное окно
 */
"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Globe, Calendar, Image as ImageIcon } from "lucide-react"
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

  const truncateUrl = (url: string, maxLength = 30) => {
    if (!url) return "-"
    // Убираем протокол для компактности
    const cleanUrl = url.replace(/^https?:\/\//, "")
    if (cleanUrl.length <= maxLength) return cleanUrl
    return cleanUrl.substring(0, maxLength) + "..."
  }

  const hasResult = lead.result_text || lead.result_image_url

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

        {/* URL */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Globe className="h-4 w-4 shrink-0" />
          <span className="text-xs truncate">{truncateUrl(lead.url)}</span>
        </div>

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
