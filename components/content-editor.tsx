/**
 * ContentEditor - Редактор контента формы
 * Позволяет настраивать тексты, AI-промпты и другие параметры формы
 * Разделён на вкладки: Данные формы, Контакты, Генерация, Результат, Поделиться
 * 
 * Использует React Query для кэширования данных
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
import { useEditorForms, useFormContent, useSaveFormContent, useCurrentUser } from "@/lib/hooks"
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
  const saveContentMutation = useSaveFormContent()
  const toggleActiveMutation = useToggleFormActive()

  // Локальное состояние
  const [selectedFormId, setSelectedFormId] = useState<string | null>(propFormId || null)
  const [content, setContent] = useState<Record<string, string>>({})
  const [loadingMessages, setLoadingMessages] = useState<string[]>(["", "", ""])
  const [systemPrompt, setSystemPrompt] = useState<string>("")
  const [resultFormat, setResultFormat] = useState<string>("text")
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

  // Обновляем локальное состояние когда загружаем контент
  useEffect(() => {
    if (contentData) {
      setContent(contentData.content)
      setLoadingMessages(contentData.loadingMessages)
      setSystemPrompt(contentData.systemPrompt)
      setResultFormat(contentData.resultFormat)
    }
  }, [contentData])

  const handleFormChange = (formId: string) => {
    userHasSelectedRef.current = true
    setSelectedFormId(formId)
  }

  const handleSave = async () => {
    if (!selectedFormId) return

    try {
      await saveContentMutation.mutateAsync({
        formId: selectedFormId,
        content,
        loadingMessages,
        systemPrompt,
        resultFormat,
      })
      
      // Проверяем и активируем форму, если она не активна
      const selectedForm = forms.find(f => f.id === selectedFormId)
      if (selectedForm && !selectedForm.is_active) {
        try {
          await toggleActiveMutation.mutateAsync({ 
            formId: selectedFormId, 
            currentIsActive: false 
          })
          toast.success("Контент сохранён и форма опубликована!")
        } catch (toggleErr) {
          toast.warning("Контент сохранён, но не удалось активировать форму: " + (toggleErr instanceof Error ? toggleErr.message : "Неизвестная ошибка"))
        }
      } else {
        toast.success("Контент сохранён!")
      }
    } catch (err) {
      toast.error("Ошибка сохранения: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
    }
  }

  const handleContinue = async () => {
    const currentIndex = tabs.findIndex(tab => tab.value === activeTab)
    
    if (currentIndex < tabs.length - 1) {
      // Переходим на следующую вкладку
      setActiveTab(tabs[currentIndex + 1].value)
    } else {
      // На последней вкладке сохраняем
      await handleSave()
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

  const handleLoadingMessageChange = (index: number, value: string) => {
    const newMessages = [...loadingMessages]
    newMessages[index] = value
    setLoadingMessages(newMessages)
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
              <ContactsTab content={content} onChange={setContent} />
            </TabsContent>

            <TabsContent value="generation" className="mt-0">
              <GenerationTab
                content={content}
                systemPrompt={systemPrompt}
                resultFormat={resultFormat}
                loadingMessages={loadingMessages}
                onContentChange={setContent}
                onSystemPromptChange={setSystemPrompt}
                onResultFormatChange={setResultFormat}
                onLoadingMessageChange={handleLoadingMessageChange}
              />
            </TabsContent>

            <TabsContent value="result" className="mt-0">
              <ResultTab content={content} onChange={setContent} />
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
                disabled={saveContentMutation.isPending || contentLoading}
                className="h-14 w-full sm:w-[335px] rounded-[18px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-base sm:text-lg"
              >
                Продолжить
              </Button>
              <Button
                onClick={handleBack}
                variant="outline"
                disabled={saveContentMutation.isPending || contentLoading}
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
                disabled={saveContentMutation.isPending || contentLoading}
                className="h-14 w-full sm:w-[335px] rounded-[18px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-base sm:text-lg"
              >
                Продолжить
              </Button>
              <Button
                onClick={handleBack}
                variant="outline"
                disabled={saveContentMutation.isPending || contentLoading}
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
                onClick={handleSave}
                disabled={saveContentMutation.isPending || contentLoading}
                className="h-14 w-full sm:w-[335px] rounded-[18px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-base sm:text-lg"
              >
                {saveContentMutation.isPending ? "Сохранение..." : "Сохранить и опубликовать"}
              </Button>
              <Button
                onClick={handleGoToShare}
                variant="outline"
                disabled={saveContentMutation.isPending || contentLoading}
                className="h-14 w-full sm:w-[335px] rounded-[18px] text-base sm:text-lg"
              >
                Поделиться
              </Button>
              <Button
                onClick={handleBack}
                variant="outline"
                disabled={saveContentMutation.isPending || contentLoading}
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
              disabled={saveContentMutation.isPending || contentLoading}
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
              disabled={saveContentMutation.isPending || contentLoading}
              className="h-14 w-full sm:w-[335px] rounded-[18px] text-base sm:text-lg"
            >
              Вернуться назад
            </Button>
          )}
        </div>
    </div>
  )
}
