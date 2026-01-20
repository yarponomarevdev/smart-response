/**
 * UsersTable - Компонент для управления пользователями
 * Только для superadmin. Показывает статистику и позволяет управлять квотами.
 * 
 * Использует React Query для кэширования данных
 */
"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { QuotaCounter } from "@/components/quota-counter"
import { cn } from "@/lib/utils"
import { useUsers, useUpdateUserQuotas } from "@/lib/hooks"
import { AlertCircle, Download } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { exportUsersToCSV } from "@/app/actions/users"
import { toast } from "sonner"

export function UsersTable() {
  const { t } = useTranslation()
  
  // React Query хуки
  const { data: users, isLoading, error } = useUsers()
  const updateQuotasMutation = useUpdateUserQuotas()
  
  // Отслеживаем, какой пользователь сейчас обновляется
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleQuotaUpdate = async (
    userId: string,
    field: "max_forms" | "max_leads" | "can_publish_forms",
    value: number | null | boolean
  ) => {
    setUpdatingUserId(userId)
    try {
      await updateQuotasMutation.mutateAsync({ userId, field, value })
    } catch (err) {
      console.error("Ошибка обновления квот:", err)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleExportToCSV = async () => {
    setIsExporting(true)
    try {
      const result = await exportUsersToCSV()
      
      if ('error' in result) {
        toast.error(result.error)
        return
      }

      // Создаем blob и скачиваем файл
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      
      link.setAttribute("href", url)
      link.setAttribute("download", `users_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = "hidden"
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      toast.success(t("users.exportSuccess"))
    } catch (err) {
      console.error("Ошибка экспорта:", err)
      toast.error(t("users.exportError"))
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">{t("users.loading")}</div>
  }

  if (error) {
    return (
      <div className="py-4 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold">{t("users.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("users.description")}</p>
        </div>
        <div>
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium mb-2">{t("errors.loadingFailed")}</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-4 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold">{t("users.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("users.description")}</p>
        </div>
        <Button
          onClick={handleExportToCSV}
          disabled={isExporting || !users || users.length === 0}
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? t("users.exporting") : t("users.exportCSV")}
        </Button>
      </div>
      <div>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">{t("users.table.email")}</TableHead>
                <TableHead className="min-w-[100px]">{t("users.table.role")}</TableHead>
                <TableHead className="min-w-[80px] text-center">{t("users.table.forms")}</TableHead>
                <TableHead className="min-w-[150px] text-center">{t("users.table.formsLimit")}</TableHead>
                <TableHead className="min-w-[180px] text-center">{t("users.table.leadsUsage")}</TableHead>
                <TableHead className="min-w-[100px] text-center">{t("users.table.publication")}</TableHead>
                <TableHead className="min-w-[120px]">{t("users.table.registration")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!users || users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t("users.noUsers")}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isUpdating = updatingUserId === user.id && updateQuotasMutation.isPending
                  const isSuperAdmin = user.role === "superadmin"
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-xs sm:text-sm max-w-[150px] truncate">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.role === "superadmin" ? "default" : "outline"} 
                          className="text-xs"
                        >
                          {user.role === "superadmin" ? t("users.roles.superadmin") : t("users.roles.user")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-center tabular-nums">
                        {user.form_count}
                      </TableCell>
                      <TableCell className="text-center">
                        {isSuperAdmin ? (
                          <div className="text-center text-muted-foreground text-sm">∞</div>
                        ) : (
                          <div className="flex justify-center">
                            <QuotaCounter
                              value={user.max_forms ?? 0}
                              onChange={(value) => handleQuotaUpdate(user.id, "max_forms", value)}
                              min={0}
                              disabled={isSuperAdmin}
                              loading={isUpdating}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isSuperAdmin ? (
                          <div className="text-xs sm:text-sm tabular-nums text-muted-foreground">
                            {user.lead_count} (∞)
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={cn(
                                "text-xs sm:text-sm tabular-nums font-medium",
                                user.max_leads !== null && user.lead_count >= user.max_leads * 0.9
                                  ? "text-destructive"
                                  : user.max_leads !== null && user.lead_count >= user.max_leads * 0.7
                                  ? "text-yellow-500"
                                  : ""
                              )}
                            >
                              {user.lead_count} / {user.max_leads ?? 0}
                            </span>
                            <QuotaCounter
                              value={user.max_leads ?? 0}
                              onChange={(value) => handleQuotaUpdate(user.id, "max_leads", value)}
                              min={0}
                              step={10}
                              disabled={isSuperAdmin}
                              loading={isUpdating}
                              className="ml-2"
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isSuperAdmin ? (
                          <div className="text-muted-foreground text-sm">✓</div>
                        ) : (
                          <div className="flex justify-center">
                            <Switch
                              checked={user.can_publish_forms}
                              onCheckedChange={(checked) => handleQuotaUpdate(user.id, "can_publish_forms", checked)}
                              disabled={isSuperAdmin || isUpdating}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
