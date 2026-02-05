/**
 * ContentEditor - Редактор контента формы
 * Позволяет настраивать тексты, AI-промпты и другие параметры формы
 * Разделён на вкладки: Данные формы, Контакты, Генерация, Результат, Поделиться
 * 
 * Все поля автосохраняются при изменении
 */
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { useEditorForms, useFormContent, useCurrentUser } from "@/lib/hooks"
import {
  FormDataTab,
  ContactsTab,
  GenerationTab,
  ResultTab,
  ShareTab,
  SettingsTab,
  DynamicFieldsTab,
} from "@/components/editor"
import { useTranslation } from "@/lib/i18n"

interface ContentEditorProps {
  formId?: string
  onBackToDashboard?: () => void
}

export function ContentEditor({ formId: propFormId, onBackToDashboard }: ContentEditorProps) {
  const { t, language } = useTranslation()
  
  // Проверяем загрузку пользователя сначала
  const { data: user, isLoading: userLoading } = useCurrentUser()
  
  // React Query хуки
  const { data: formsData, isLoading: formsLoading, error: formsError } = useEditorForms()

  // Локальное состояние
  const [selectedFormId, setSelectedFormId] = useState<string | null>(propFormId || null)
  const [activeTab, setActiveTab] = useState("data")
  const [maxVisitedTabIndex, setMaxVisitedTabIndex] = useState(0)
  const propFormIdRef = useRef<string | undefined>(propFormId)
  const userHasSelectedRef = useRef<boolean>(false)

  const forms = formsData?.forms || []
  const firstFormId = forms.length > 0 ? forms[0].id : null

  // Мемоизируем вкладки с зависимостью от языка, чтобы они обновлялись при смене языка
  const tabs = useMemo(
    () => [
      { value: "data", label: t("editor.tabs.data") },
      { value: "contacts", label: t("editor.tabs.contacts") },
      { value: "generation", label: t("editor.tabs.generation") },
      { value: "result", label: t("editor.tabs.result") },
      { value: "share", label: t("editor.tabs.share") },
      { value: "settings", label: t("editor.tabs.settings") }
    ],
    [t, language]
  )

  // Устанавливаем форму из пропсов при изменении propFormId (переход из карточки)
  useEffect(() => {
    if (propFormId !== propFormIdRef.current) {
      propFormIdRef.current = propFormId
      userHasSelectedRef.current = false
      if (propFormId) {
        setSelectedFormId(propFormId)
      }
    }
  }, [propFormId])

  // Устанавливаем первую форму по умолчанию, если нет выбранной формы
  useEffect(() => {
    if (!selectedFormId && firstFormId && !userHasSelectedRef.current) {
      setSelectedFormId(firstFormId)
    }
  }, [firstFormId, selectedFormId])

  // Отслеживаем прогресс вкладок - обновляем максимальный индекс только при движении вперед
  useEffect(() => {
    const currentTabIndex = tabs.findIndex(tab => tab.value === activeTab)
    if (currentTabIndex !== -1 && currentTabIndex > maxVisitedTabIndex) {
      setMaxVisitedTabIndex(currentTabIndex)
    }
  }, [activeTab, tabs, maxVisitedTabIndex])

  // Загружаем контент выбранной формы
  const { data: contentData, isLoading: contentLoading, error: contentError } = useFormContent(selectedFormId)

  const handleFormChange = (formId: string) => {
    userHasSelectedRef.current = true
    setSelectedFormId(formId)
  }


  const handleContinue = () => {
    const currentIndex = tabs.findIndex(tab => tab.value === activeTab)
    
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].value)
    }
  }

  const handleBack = () => {
    const currentIndex = tabs.findIndex(tab => tab.value === activeTab)
    
    if (currentIndex === 0) {
      // На первой вкладке возвращаемся на дашборд
      onBackToDashboard?.()
    } else if (currentIndex > 0) {
      // На остальных переходим на предыдущую вкладку
      setActiveTab(tabs[currentIndex - 1].value)
    }
  }

  const handleGoToShare = () => {
    setActiveTab("share")
  }

  const isLoading = userLoading || formsLoading || contentLoading

  // Показываем загрузку, если пользователь еще загружается или данные еще не загрузились
  if (userLoading || (isLoading && !contentData && !formsData)) {
    return <div className="text-center py-8">{t("editor.loadingContent")}</div>
  }

  // Проверяем ошибки перед проверкой загрузки
  if (formsError) {
    return (
      <div className="py-4">
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium mb-2">{t("editor.loadingFormsError")}</p>
          <p className="text-sm text-muted-foreground">{formsError.message}</p>
        </div>
      </div>
    )
  }

  if (contentError) {
    return (
      <div className="py-4">
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium mb-2">{t("editor.loadingContentError")}</p>
          <p className="text-sm text-muted-foreground">{contentError.message}</p>
        </div>
      </div>
    )
  }

  // Показываем "форма не найдена" только если пользователь загружен и данных нет
  if (!userLoading && !formsLoading && !selectedFormId && forms.length === 0) {
    return (
      <div className="py-4">
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">{t("editor.noForms")}</p>
          <p className="text-sm text-muted-foreground">{t("editor.noFormsDescription")}</p>
        </div>
      </div>
    )
  }

  const selectedForm = forms.find(f => f.id === selectedFormId)
  const content = contentData?.content || {}
  const loadingMessages = contentData?.loadingMessages || ["", "", ""]
  const systemPrompt = contentData?.systemPrompt || ""

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Вкладки редактора */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-11 flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
            {/* Десктопная навигация */}
            <div className="relative w-fit hidden md:block">
              <TabsList className="w-full justify-start bg-transparent rounded-none h-auto p-0 gap-6 pb-2">
                {tabs.map((tab, index) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-transparent data-[state=active]:bg-transparent px-0 py-0"
                  >
                    <span className={cn(
                      "transition-opacity duration-300",
                      activeTab === tab.value ? "opacity-100" : "opacity-70 hover:opacity-100"
                    )}>
                      {index + 1}. {tab.label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {/* Линия прогресса */}
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-muted">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-in-out"
                  style={{
                    width: `${((tabs.findIndex(tab => tab.value === activeTab) + 1) / tabs.length) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Выбор формы */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {forms.length > 1 && (
                <Select value={selectedFormId || ""} onValueChange={handleFormChange}>
                  <SelectTrigger className="h-9 w-full md:w-[240px] rounded-lg border-2 border-primary/10 bg-background px-3 text-sm font-medium hover:border-primary/20 transition-colors focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-muted-foreground font-normal">{t("editor.form")}:</span>
                      <SelectValue placeholder={t("editor.selectForm")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.isMain ? `${form.name} (${t("editor.mainForm")})` : form.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {forms.length === 1 && (
                <div className="h-9 flex items-center px-3 rounded-lg border-2 border-primary/10 bg-muted/20 w-full md:w-auto">
                  <span className="text-sm font-medium text-muted-foreground mr-2">{t("editor.form")}:</span>
                  <span className="text-sm font-medium">{selectedForm?.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Мобильная навигация */}
          <div className="md:hidden flex items-center justify-between mb-6 bg-muted/30 p-4 rounded-xl border">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {t("editor.step")} {tabs.findIndex(t => t.value === activeTab) + 1} / {tabs.length}
              </span>
              <span className="font-semibold text-lg leading-none">
                {tabs.find(t => t.value === activeTab)?.label}
              </span>
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                 <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
                   <Menu className="h-5 w-5" />
                 </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[20px] max-h-[80vh] overflow-y-auto">
                <SheetHeader className="mb-4 text-left">
                  <SheetTitle>{t("editor.steps")}</SheetTitle>
                </SheetHeader>
                <div className="grid gap-2">
                  {tabs.map((tab, index) => {
                    const isActive = activeTab === tab.value
                    return (
                      <SheetClose asChild key={tab.value}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "justify-start h-14 text-base font-normal",
                            isActive && "bg-secondary/50 font-medium"
                          )}
                          onClick={() => setActiveTab(tab.value)}
                        >
                          <span className={cn(
                            "mr-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                            isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            {index + 1}
                          </span>
                          {tab.label}
                        </Button>
                      </SheetClose>
                    )
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="pt-0 md:pt-6">
            <TabsContent value="data" className="mt-0">
              <DynamicFieldsTab formId={selectedFormId} />
            </TabsContent>

            <TabsContent value="contacts" className="mt-0">
              <ContactsTab formId={selectedFormId} content={content} />
            </TabsContent>

            <TabsContent value="generation" className="mt-0">
              <GenerationTab
                formId={selectedFormId}
                systemPrompt={systemPrompt}
                loadingMessages={loadingMessages}
                content={content}
              />
            </TabsContent>

            <TabsContent value="result" className="mt-0">
              <ResultTab formId={selectedFormId} content={content} />
            </TabsContent>

            <TabsContent value="share" className="mt-0">
              <ShareTab formId={selectedFormId} />
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <SettingsTab formId={selectedFormId} />
            </TabsContent>
          </div>
        </Tabs>

            {/* Кнопки действий */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t mt-auto z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
              <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row gap-3 justify-end">
                {/* Вкладка "Данные формы" */}
                {activeTab === "data" && (
                  <>
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      disabled={contentLoading}
                      className="h-11 rounded-lg text-base w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {t("editor.goBack")}
                    </Button>
                    <Button
                      onClick={handleContinue}
                      disabled={contentLoading}
                      className="h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-base w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {t("editor.continue")}
                    </Button>
                  </>
                )}

                {/* Вкладки "Контакты" и "Генерация" */}
                {(activeTab === "contacts" || activeTab === "generation") && (
                  <>
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      disabled={contentLoading}
                      className="h-11 rounded-lg text-base w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {t("editor.goBack")}
                    </Button>
                    <Button
                      onClick={handleContinue}
                      disabled={contentLoading}
                      className="h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-base w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {t("editor.continue")}
                    </Button>
                  </>
                )}

                {/* Вкладка "Результат" */}
                {activeTab === "result" && (
                  <>
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      disabled={contentLoading}
                      className="h-11 rounded-lg text-base w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {t("editor.goBack")}
                    </Button>
                    <Button
                      onClick={handleGoToShare}
                      disabled={contentLoading}
                      className="h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-base w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {t("editor.share")}
                    </Button>
                  </>
                )}

                {/* Вкладка "Поделиться" */}
                {activeTab === "share" && (
                  <>
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      disabled={contentLoading}
                      className="h-11 rounded-lg text-base w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {t("editor.goBack")}
                    </Button>
                    <Button
                      onClick={() => setActiveTab("settings")}
                      disabled={contentLoading}
                      className="h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-base w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {t("editor.tabs.settings")}
                    </Button>
                  </>
                )}

                {/* Вкладка "Настройки" */}
                {activeTab === "settings" && (
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    disabled={contentLoading}
                    className="h-11 rounded-lg text-base w-full sm:w-auto sm:min-w-[140px]"
                  >
                    {t("editor.goBack")}
                  </Button>
                )}
              </div>
            </div>
    </div>
  )
}
