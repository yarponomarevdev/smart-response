"use client"

import { useEffect, useState, useCallback } from "react"
import { getAllUsers, updateUserQuotas } from "@/app/actions/users"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { QuotaCounter } from "@/components/quota-counter"
import { cn } from "@/lib/utils"

interface UserWithStats {
  id: string
  email: string
  role: string
  created_at: string
  form_count: number
  lead_count: number
  max_forms: number | null
  max_leads: number | null
  can_publish_forms: boolean
}

export function UsersTable() {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await getAllUsers()

      if ("error" in result) {
        setError(result.error)
        setLoading(false)
        return
      }

      setUsers(result.users)
      setLoading(false)
    }

    fetchUsers()
  }, [])

  const handleQuotaUpdate = useCallback(async (
    userId: string,
    field: "max_forms" | "max_leads" | "can_publish_forms",
    value: number | null | boolean
  ) => {
    // Добавляем пользователя в список обновляемых
    setUpdatingUsers(prev => new Set(prev).add(userId))

    // Оптимистичное обновление UI
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, [field]: value } : user
    ))

    try {
      const result = await updateUserQuotas({
        userId,
        [field]: value,
      })

      if ("error" in result) {
        // Откатываем изменения при ошибке
        const refreshResult = await getAllUsers()
        if (!("error" in refreshResult)) {
          setUsers(refreshResult.users)
        }
        console.error("Ошибка обновления:", result.error)
      } else {
        // Перезагружаем данные после успешного обновления для синхронизации
        const refreshResult = await getAllUsers()
        if (!("error" in refreshResult)) {
          setUsers(refreshResult.users)
        }
      }
    } catch (err) {
      console.error("Ошибка обновления квот:", err)
      // Перезагружаем данные при ошибке
      const refreshResult = await getAllUsers()
      if (!("error" in refreshResult)) {
        setUsers(refreshResult.users)
      }
    } finally {
      setUpdatingUsers(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }, [])

  if (loading) {
    return <div className="text-center py-8">Загрузка пользователей...</div>
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
          <CardDescription>Все зарегистрированные пользователи и их статистика</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl">Пользователи</CardTitle>
        <CardDescription className="text-sm">Управление квотами и статистика пользователей</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Email</TableHead>
                <TableHead className="min-w-[100px]">Роль</TableHead>
                <TableHead className="min-w-[80px] text-center">Формы</TableHead>
                <TableHead className="min-w-[150px] text-center">Лимит форм</TableHead>
                <TableHead className="min-w-[180px] text-center">Использование лидов</TableHead>
                <TableHead className="min-w-[100px] text-center">Публикация</TableHead>
                <TableHead className="min-w-[120px]">Регистрация</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Пользователей пока нет
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isUpdating = updatingUsers.has(user.id)
                  const isSuperAdmin = user.role === "superadmin"
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-xs sm:text-sm max-w-[150px] truncate">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.role === "superadmin" ? "default" : user.role === "admin" ? "secondary" : "outline"} 
                          className="text-xs"
                        >
                          {user.role === "superadmin" ? "Суперадмин" : user.role === "admin" ? "Админ" : "Пользователь"}
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
                        {new Date(user.created_at).toLocaleDateString("ru-RU")}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
