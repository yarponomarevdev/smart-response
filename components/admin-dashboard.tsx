/**
 * AdminDashboard - Главный компонент админ-панели
 * Показывает разный интерфейс в зависимости от роли:
 * - superadmin: управление главной формой, создание форм (неограниченно), просмотр всех пользователей
 * - admin: управление своими формами (неограниченно), лиды, контент
 * - user: управление одной формой, лиды, контент
 */
"use client"

import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LeadsTable } from "./leads-table"
import { ContentEditor } from "./content-editor"
import { FormsManager } from "./forms-manager"
import { UsersTable } from "./users-table"
import { SystemSettingsEditor } from "./system-settings-editor"
import { UserSettingsEditor } from "./user-settings-editor"
import { BalanceTab } from "./editor"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

// ID главной формы для суперадмина
const MAIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"

export function AdminDashboard() {
  const { t, language } = useTranslation()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [editorFormId, setEditorFormId] = useState<string | undefined>(undefined)
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
        setUserRole(data?.role || "user")
      }
      setLoading(false)
    }

    fetchUserRole()
  }, [])

  // Вычисляем роли до условного возврата (нужно для useMemo)
  const isSuperAdmin = userRole === "superadmin"

  // Мемоизируем заголовок и описание с зависимостью от языка
  // ВАЖНО: все хуки должны быть до условного return
  const panelTitle = useMemo(() => {
    if (isSuperAdmin) return t("admin.panel.superadminTitle")
    return t("admin.panel.userTitle")
  }, [isSuperAdmin, t, language])

  const panelDescription = useMemo(() => {
    if (isSuperAdmin) return t("admin.panel.superadminDescription")
    return t("admin.panel.userDescription")
  }, [isSuperAdmin, t, language])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">{t("common.loading")}</div>
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">{panelTitle}</h1>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button onClick={handleLogout} className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[18px] bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800 border border-border text-sm sm:text-base transition-colors">
                <LogOut className="mr-1 sm:mr-2 h-4 w-4" />
                <span>{t("common.logout")}</span>
              </Button>
            </div>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">{panelDescription}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="flex-wrap h-auto border-b border-border p-0 gap-6">
            {isSuperAdmin ? (
              <>
                <TabsTrigger value="dashboard">{t("admin.tabs.dashboard")}</TabsTrigger>
                <TabsTrigger value="editor">{t("admin.tabs.editor")}</TabsTrigger>
                <TabsTrigger value="leads">{t("admin.tabs.leads")}</TabsTrigger>
                <TabsTrigger value="users">{t("admin.tabs.users")}</TabsTrigger>
                <TabsTrigger value="integrations" disabled className="relative">
                  {t("admin.tabs.integrations")}
                  <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded">
                    {t("admin.tabs.comingSoon")}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="system">{t("admin.tabs.settings")}</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="dashboard">{t("admin.tabs.dashboard")}</TabsTrigger>
                <TabsTrigger value="editor">{t("admin.tabs.editor")}</TabsTrigger>
                <TabsTrigger value="leads">{t("admin.tabs.leads")}</TabsTrigger>
                <TabsTrigger value="integrations" disabled className="relative">
                  {t("admin.tabs.integrations")}
                  <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded">
                    {t("admin.tabs.comingSoon")}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="balance">{t("admin.tabs.balance")}</TabsTrigger>
                <TabsTrigger value="settings">{t("admin.tabs.settings")}</TabsTrigger>
              </>
            )}
          </TabsList>

          {isSuperAdmin ? (
            <>
              <TabsContent value="dashboard" className="space-y-4">
                <FormsManager onOpenEditor={(formId) => {
                  setEditorFormId(formId)
                  setActiveTab("editor")
                }} />
              </TabsContent>
              <TabsContent value="editor" className="space-y-4">
                <ContentEditor formId={editorFormId} onBackToDashboard={() => setActiveTab("dashboard")} />
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
              <TabsContent value="system" className="space-y-4">
                <SystemSettingsEditor />
              </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="dashboard" className="space-y-4">
                <FormsManager onOpenEditor={(formId) => {
                  setEditorFormId(formId)
                  setActiveTab("editor")
                }} />
              </TabsContent>
              <TabsContent value="editor" className="space-y-4">
                <ContentEditor formId={editorFormId} onBackToDashboard={() => setActiveTab("dashboard")} />
              </TabsContent>
              <TabsContent value="leads" className="space-y-4">
                <LeadsTable />
              </TabsContent>
              <TabsContent value="integrations" className="space-y-4">
                {/* Скоро */}
              </TabsContent>
              <TabsContent value="balance" className="space-y-4">
                <BalanceTab />
              </TabsContent>
              <TabsContent value="settings" className="space-y-4">
                <UserSettingsEditor />
              </TabsContent>
            </>
          )}
        </Tabs>
    </div>
  )
}
