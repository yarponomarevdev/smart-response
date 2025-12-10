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
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LeadsTable } from "./leads-table"
import { ContentEditor } from "./content-editor"
import { FormsManager } from "./forms-manager"
import { UsersTable } from "./users-table"
import { SystemSettingsEditor } from "./system-settings-editor"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

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
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

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
    if (isSuperAdmin) return "Панель супер-админа"
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
      <div className="container mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">{getPanelTitle()}</h1>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button onClick={handleLogout} variant="outline" size="sm" className="h-9 sm:h-10 text-xs sm:text-sm">
                <LogOut className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Выход</span>
              </Button>
            </div>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">{getPanelDescription()}</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4 sm:space-y-6">
          <TabsList className="flex-wrap h-auto border-b border-border">
            {isSuperAdmin ? (
              <>
                <TabsTrigger value="dashboard">Дашборд</TabsTrigger>
                <TabsTrigger value="editor">Редактор</TabsTrigger>
                <TabsTrigger value="leads">Ответы</TabsTrigger>
                <TabsTrigger value="users">Пользователи</TabsTrigger>
                <TabsTrigger value="integrations" disabled className="relative">
                  Интеграции
                  <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded">Скоро</span>
                </TabsTrigger>
                <TabsTrigger value="balance" disabled className="relative">
                  Баланс
                  <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded">Скоро</span>
                </TabsTrigger>
                <TabsTrigger value="system">Настройки</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="dashboard">Дашборд</TabsTrigger>
                <TabsTrigger value="editor">Редактор</TabsTrigger>
                <TabsTrigger value="leads">Ответы</TabsTrigger>
                <TabsTrigger value="integrations" disabled className="relative">
                  Интеграции
                  <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded">Скоро</span>
                </TabsTrigger>
                <TabsTrigger value="balance" disabled className="relative">
                  Баланс
                  <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded">Скоро</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {isSuperAdmin ? (
            <>
              <TabsContent value="dashboard" className="space-y-4">
                <FormsManager />
              </TabsContent>
              <TabsContent value="editor" className="space-y-4">
                <ContentEditor />
              </TabsContent>
              <TabsContent value="leads" className="space-y-4">
                <LeadsTable />
              </TabsContent>
              <TabsContent value="users" className="space-y-4">
                <UsersTable />
              </TabsContent>
              <TabsContent value="integrations" className="space-y-4">
                {/* Скоро */}
              </TabsContent>
              <TabsContent value="balance" className="space-y-4">
                {/* Скоро */}
              </TabsContent>
              <TabsContent value="system" className="space-y-4">
                <SystemSettingsEditor />
              </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="dashboard" className="space-y-4">
                <FormsManager />
              </TabsContent>
              <TabsContent value="editor" className="space-y-4">
                <ContentEditor />
              </TabsContent>
              <TabsContent value="leads" className="space-y-4">
                <LeadsTable />
              </TabsContent>
              <TabsContent value="integrations" className="space-y-4">
                {/* Скоро */}
              </TabsContent>
              <TabsContent value="balance" className="space-y-4">
                {/* Скоро */}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}
