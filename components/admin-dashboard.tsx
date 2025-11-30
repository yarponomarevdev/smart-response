/**
 * AdminDashboard - Главный компонент админ-панели
 * Показывает разный интерфейс в зависимости от роли:
 * - superadmin: управление главной формой, создание форм (неограниченно), просмотр всех пользователей
 * - admin: управление своими формами (неограниченно), лиды, контент
 * - user: управление одной формой, лиды, контент
 */
"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LeadsTable } from "./leads-table"
import { ContentEditor } from "./content-editor"
import { AdminHeader } from "./admin-header"
import { FormsManager } from "./forms-manager"
import { UsersTable } from "./users-table"
import { createClient } from "@/lib/supabase/client"

// ID главной формы для суперадмина
const MAIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"

// UID админов с расширенными правами
const ADMIN_UIDS = [
  "6cb16c09-6a85-4079-9579-118168e95b06",
]

export function AdminDashboard() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserRole = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserId(user.id)
        const { data } = await supabase.from("users").select("role").eq("id", user.id).single()
        
        // Проверяем роль в БД или хардкод для админов
        let role = data?.role || "user"
        if (ADMIN_UIDS.includes(user.id) && role === "user") {
          role = "admin"
        }
        setUserRole(role)
      }
      setLoading(false)
    }

    fetchUserRole()
  }, [])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Загрузка...</div>
  }

  const isSuperAdmin = userRole === "superadmin"
  const isAdmin = userRole === "admin" || (userId && ADMIN_UIDS.includes(userId))

  // Определяем заголовок панели
  const getPanelTitle = () => {
    if (isSuperAdmin) return "Панель суперадмина"
    if (isAdmin) return "Панель администратора"
    return "Панель управления"
  }

  const getPanelDescription = () => {
    if (isSuperAdmin) return "Управление главной формой, создание форм и просмотр всех пользователей"
    if (isAdmin) return "Управление вашими формами и лидами (неограниченное количество форм)"
    return "Управление вашей формой и лидами"
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{getPanelTitle()}</h1>
          <p className="text-muted-foreground">{getPanelDescription()}</p>
        </div>

        <Tabs defaultValue={isSuperAdmin ? "content" : "form"} className="space-y-6">
          <TabsList>
            {isSuperAdmin ? (
              <>
                <TabsTrigger value="content">Главная форма</TabsTrigger>
                <TabsTrigger value="forms">Мои формы</TabsTrigger>
                <TabsTrigger value="form-content">Контент</TabsTrigger>
                <TabsTrigger value="leads">Лиды</TabsTrigger>
                <TabsTrigger value="users">Пользователи</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="form">Мои формы</TabsTrigger>
                <TabsTrigger value="leads">Лиды</TabsTrigger>
                <TabsTrigger value="content">Контент</TabsTrigger>
              </>
            )}
          </TabsList>

          {isSuperAdmin ? (
            <>
              <TabsContent value="content" className="space-y-4">
                <ContentEditor formId={MAIN_FORM_ID} />
              </TabsContent>
              <TabsContent value="forms" className="space-y-4">
                <FormsManager />
              </TabsContent>
              <TabsContent value="form-content" className="space-y-4">
                <ContentEditor />
              </TabsContent>
              <TabsContent value="leads" className="space-y-4">
                <LeadsTable formId={MAIN_FORM_ID} />
              </TabsContent>
              <TabsContent value="users" className="space-y-4">
                <UsersTable />
              </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="form" className="space-y-4">
                <FormsManager />
              </TabsContent>
              <TabsContent value="leads" className="space-y-4">
                <LeadsTable />
              </TabsContent>
              <TabsContent value="content" className="space-y-4">
                <ContentEditor />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}
