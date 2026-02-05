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
import { LanguageToggle } from "@/components/language-toggle"
import { LeadsView } from "./leads-view"
import { ContentEditor } from "./content-editor"
import { FormsManager } from "./forms-manager"
import { UsersTable } from "./users-table"
import { SystemSettingsEditor } from "./system-settings-editor"
import { UserSettingsEditor } from "./user-settings-editor"
import { BalanceTab } from "./editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useEditorForms } from "@/lib/hooks"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, Menu, Home } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// ID главной формы для суперадмина
const MAIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"

export function AdminDashboard() {
  const { t, language } = useTranslation()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [editorFormId, setEditorFormId] = useState<string | undefined>(undefined)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { data: formsData } = useEditorForms()
  const forms = formsData?.forms || []
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)

  // Устанавливаем первую форму по умолчанию, если нет выбранной
  useEffect(() => {
    if (!selectedFormId && forms.length > 0) {
      setSelectedFormId(forms[0].id)
    }
  }, [forms, selectedFormId])

  // Обновляем selectedFormId при выборе формы в FormsManager
  useEffect(() => {
    if (editorFormId) {
      setSelectedFormId(editorFormId)
    }
  }, [editorFormId])

  const handleFormChange = (formId: string) => {
    setSelectedFormId(formId)
    // Если мы не на табе редактора или ответов, переключаемся на редактор?
    // Пока оставим как есть, просто меняем контекст
  }
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Функция для переключения вкладки
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setMobileMenuOpen(false)
  }

  // Рендерим элементы меню
  const renderMenuItems = () => {
    const superAdminTabs = [
      { value: "dashboard", label: t("admin.tabs.dashboard") },
      { value: "editor", label: t("admin.tabs.editor") },
      { value: "leads", label: t("admin.tabs.leads") },
      { value: "users", label: t("admin.tabs.users") },
      { 
        value: "integrations", 
        label: t("admin.tabs.integrations"), 
        disabled: true,
        badge: t("admin.tabs.comingSoon")
      },
      { value: "system", label: t("admin.tabs.settings") },
    ]

    const userTabs = [
      { value: "dashboard", label: t("admin.tabs.dashboard") },
      { value: "editor", label: t("admin.tabs.editor") },
      { value: "leads", label: t("admin.tabs.leads") },
      { 
        value: "integrations", 
        label: t("admin.tabs.integrations"), 
        disabled: true,
        badge: t("admin.tabs.comingSoon")
      },
      { value: "balance", label: t("admin.tabs.balance") },
      { value: "settings", label: t("admin.tabs.settings") },
    ]

    const tabs = isSuperAdmin ? superAdminTabs : userTabs

    return tabs.map((tab) => (
      <button
        key={tab.value}
        onClick={() => !tab.disabled && handleTabChange(tab.value)}
        disabled={tab.disabled}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors",
          activeTab === tab.value
            ? "bg-primary text-primary-foreground font-medium"
            : "hover:bg-accent",
          tab.disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span>{tab.label}</span>
        {tab.badge && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
            {tab.badge}
          </span>
        )}
      </button>
    ))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" suppressHydrationWarning>
        {mounted ? t("common.loading") : "Loading..."}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Бургер-меню для мобильных */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                  <SheetHeader>
                    <SheetTitle>{t("admin.panel.menu")}</SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 flex flex-col gap-2">
                    {renderMenuItems()}
                    {isSuperAdmin && (
                      <Link
                        href="/"
                        className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-left transition-colors hover:bg-accent"
                      >
                        <Home className="h-4 w-4" />
                        <span>{t("admin.panel.backToLanding")}</span>
                      </Link>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
              <h1 className="text-xl font-bold">{panelTitle}</h1>
              
              {/* Выбор формы в хедере */}
              {activeTab === "editor" && forms.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground hidden sm:inline-block">/</span>
                  <Select value={selectedFormId || ""} onValueChange={handleFormChange}>
                    <SelectTrigger className="h-9 w-[200px] sm:w-[240px] border-none bg-transparent hover:bg-accent/50 focus:ring-0 focus:ring-offset-0 px-2 font-medium">
                      <SelectValue placeholder={t("editor.selectForm")} />
                    </SelectTrigger>
                    <SelectContent>
                      {forms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          {form.isMain ? `${form.name} (${t("editor.mainForm")})` : form.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {activeTab !== "editor" && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setActiveTab("editor")}
                  className="hidden sm:flex"
                >
                  {t("admin.tabs.goToEditor")}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden sm:flex"
                >
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    <span>{t("admin.panel.backToLanding")}</span>
                  </Link>
                </Button>
              )}
              <LanguageToggle className="h-9 w-9 sm:h-9 sm:w-9 rounded-full bg-transparent border-none shadow-none hover:bg-accent hover:text-accent-foreground" />
              <ThemeToggle className="h-9 w-9 sm:h-9 sm:w-9 rounded-full bg-transparent border-none shadow-none hover:bg-accent hover:text-accent-foreground" />
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout} 
                className="hidden sm:flex"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t("common.logout")}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout} 
                className="sm:hidden"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-8 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          <div className="space-y-2">
            <p className="text-sm sm:text-base text-muted-foreground">{panelDescription}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            {/* Десктоп меню */}
            <TabsList className="hidden md:flex flex-wrap h-auto border-b border-border p-0 gap-6 bg-transparent">
              {isSuperAdmin ? (
                <>
                  <TabsTrigger 
                    value="dashboard"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
                  >
                    {t("admin.tabs.dashboard")}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="editor"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
                  >
                    {t("admin.tabs.editor")}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="leads"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
                  >
                    {t("admin.tabs.leads")}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="users"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
                  >
                    {t("admin.tabs.users")}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="integrations" 
                    disabled 
                    className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-2 opacity-50 cursor-not-allowed"
                  >
                    {t("admin.tabs.integrations")}
                    <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {t("admin.tabs.comingSoon")}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="system"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
                  >
                    {t("admin.tabs.settings")}
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger 
                    value="dashboard"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
                  >
                    {t("admin.tabs.dashboard")}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="editor"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
                  >
                    {t("admin.tabs.editor")}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="leads"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
                  >
                    {t("admin.tabs.leads")}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="integrations" 
                    disabled 
                    className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-2 opacity-50 cursor-not-allowed"
                  >
                    {t("admin.tabs.integrations")}
                    <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {t("admin.tabs.comingSoon")}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="balance"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
                  >
                    {t("admin.tabs.balance")}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2"
                  >
                    {t("admin.tabs.settings")}
                  </TabsTrigger>
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
                  <ContentEditor formId={selectedFormId || undefined} onBackToDashboard={() => setActiveTab("dashboard")} />
                </TabsContent>
                <TabsContent value="leads" className="space-y-4">
                  <LeadsView />
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
                  <ContentEditor formId={selectedFormId || undefined} onBackToDashboard={() => setActiveTab("dashboard")} />
                </TabsContent>
                <TabsContent value="leads" className="space-y-4">
                  <LeadsView />
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
      </main>
    </div>
  )
}
