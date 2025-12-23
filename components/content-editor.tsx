/**
 * ContentEditor - Редактор контента формы
 * Позволяет настраивать тексты, AI-промпты и другие параметры формы
 * Разделён на вкладки: Данные формы, Контакты, Генерация, Результат, Поделиться
 * 
 * Все поля автосохраняются при изменении
 */
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { useEditorForms, useFormContent, useCurrentUser } from "@/lib/hooks"
import { useToggleFormActive } from "@/lib/hooks/use-forms"
import {
  FormDataTab,
  ContactsTab,
  GenerationTab,
  ResultTab,
  ShareTab,
  SettingsTab,
  DynamicFieldsTab,
} from "@/components/editor"

interface ContentEditorProps {
  formId?: string
  onBackToDashboard?: () => void
}

export function ContentEditor({ formId: propFormId, onBackToDashboard }: ContentEditorProps) {
  // Проверяем загрузку пользователя сначала
  const { data: user, isLoading: userLoading } = useCurrentUser()
  
  // React Query хуки
  const { data: formsData, isLoading: formsLoading, error: formsError } = useEditorForms()
  const toggleActiveMutation = useToggleFormActive()

  // Локальное состояние
  const [selectedFormId, setSelectedFormId] = useState<string | null>(propFormId || null)
  const [activeTab, setActiveTab] = useState("data")
  const propFormIdRef = useRef<string | undefined>(propFormId)
  const userHasSelectedRef = useRef<boolean>(false)

  const forms = formsData?.forms || []
  const firstFormId = forms.length > 0 ? forms[0].id : null

  const tabs = [
    { value: "data", label: "Данные формы" },
    { value: "contacts", label: "Контакты" },
    { value: "generation", label: "Генерация" },
    { value: "result", label: "Результат" },
    { value: "share", label: "Поделиться" },
    { value: "settings", label: "Настройки" }
  ]

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

  // Загружаем контент выбранной формы
  const { data: contentData, isLoading: contentLoading, error: contentError } = useFormContent(selectedFormId)

  const handleFormChange = (formId: string) => {
    userHasSelectedRef.current = true
    setSelectedFormId(formId)
  }

  const handlePublish = async () => {
    if (!selectedFormId) return

    try {
      // Проверяем и активируем форму, если она не активна
      const selectedForm = forms.find(f => f.id === selectedFormId)
      if (selectedForm && !selectedForm.is_active) {
        await toggleActiveMutation.mutateAsync({ 
          formId: selectedFormId, 
          currentIsActive: false 
        })
        toast.success("Форма опубликована!")
      } else {
        toast.info("Форма уже опубликована")
      }
    } catch (err) {
      toast.error("Ошибка публикации: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
    }
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
    return <div className="text-center py-8">Загрузка контента...</div>
  }

  // Проверяем ошибки перед проверкой загрузки
  if (formsError) {
    return (
      <div className="py-4">
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium mb-2">Ошибка загрузки форм</p>
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
          <p className="text-lg font-medium mb-2">Ошибка загрузки контента</p>
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
          <p className="text-lg font-medium mb-2">Форма не найдена</p>
          <p className="text-sm text-muted-foreground">Сначала создайте форму.</p>
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
      {/* Выбор формы */}
      <div>
        {/* Выбор формы (если несколько) */}
        {forms.length > 1 && (
          <Select value={selectedFormId || ""} onValueChange={handleFormChange}>
            <SelectTrigger className="h-12 w-auto rounded-[18px] gap-2 px-0">
              <SelectValue placeholder="Выберите форму" />
            </SelectTrigger>
            <SelectContent>
              {forms.map((form) => (
                <SelectItem key={form.id} value={form.id} className="text-base">
                  {form.isMain ? `${form.name} (Главная)` : form.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {forms.length === 1 && (
          <div className="h-12 flex items-center rounded-[18px]">
            <span className="text-sm">{selectedForm?.name || "Форма"}</span>
          </div>
        )}
      </div>

      {/* Вкладки редактора */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-6">
            {tabs.map((tab, index) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
              >
                {index + 1}. {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="pt-6">
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
        <div className="flex flex-col gap-3">
          {/* Вкладка "Данные формы" */}
          {activeTab === "data" && (
            <>
              <Button
                onClick={handleContinue}
                disabled={contentLoading}
                className="h-14 w-full sm:w-[335px] rounded-[18px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-base sm:text-lg"
              >
                Продолжить
              </Button>
              <Button
                onClick={handleBack}
                variant="outline"
                disabled={contentLoading}
                className="h-14 w-full sm:w-[335px] rounded-[18px] text-base sm:text-lg"
              >
                Вернуться назад
              </Button>
            </>
          )}

          {/* Вкладки "Контакты" и "Генерация" */}
          {(activeTab === "contacts" || activeTab === "generation") && (
            <>
              <Button
                onClick={handleContinue}
                disabled={contentLoading}
                className="h-14 w-full sm:w-[335px] rounded-[18px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-base sm:text-lg"
              >
                Продолжить
              </Button>
              <Button
                onClick={handleBack}
                variant="outline"
                disabled={contentLoading}
                className="h-14 w-full sm:w-[335px] rounded-[18px] text-base sm:text-lg"
              >
                Вернуться назад
              </Button>
            </>
          )}

          {/* Вкладка "Результат" */}
          {activeTab === "result" && (
            <>
              <Button
                onClick={handlePublish}
                disabled={toggleActiveMutation.isPending || contentLoading}
                className="h-14 w-full sm:w-[335px] rounded-[18px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-base sm:text-lg"
              >
                {toggleActiveMutation.isPending ? "Публикация..." : "Сохранить и опубликовать"}
              </Button>
              <Button
                onClick={handleGoToShare}
                variant="outline"
                disabled={contentLoading}
                className="h-14 w-full sm:w-[335px] rounded-[18px] text-base sm:text-lg"
              >
                Поделиться
              </Button>
              <Button
                onClick={handleBack}
                variant="outline"
                disabled={contentLoading}
                className="h-14 w-full sm:w-[335px] rounded-[18px] text-base sm:text-lg"
              >
                Вернуться назад
              </Button>
            </>
          )}

          {/* Вкладка "Поделиться" */}
          {activeTab === "share" && (
            <Button
              onClick={handleBack}
              variant="outline"
              disabled={contentLoading}
              className="h-14 w-full sm:w-[335px] rounded-[18px] text-base sm:text-lg"
            >
              Вернуться назад
            </Button>
          )}

          {/* Вкладка "Настройки" */}
          {activeTab === "settings" && (
            <Button
              onClick={handleBack}
              variant="outline"
              disabled={contentLoading}
              className="h-14 w-full sm:w-[335px] rounded-[18px] text-base sm:text-lg"
            >
              Вернуться назад
            </Button>
          )}
        </div>
    </div>
  )
}
