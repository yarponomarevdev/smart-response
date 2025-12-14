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
import {
  FormDataTab,
  ContactsTab,
  GenerationTab,
  ResultTab,
  ShareTab,
  DynamicFieldsTab,
} from "@/components/editor"

interface ContentEditorProps {
  formId?: string
}

export function ContentEditor({ formId: propFormId }: ContentEditorProps) {
  // Проверяем загрузку пользователя сначала
  const { data: user, isLoading: userLoading } = useCurrentUser()
  
  // React Query хуки
  const { data: formsData, isLoading: formsLoading, error: formsError } = useEditorForms()
  const saveContentMutation = useSaveFormContent()

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

  const tabTitles: Record<string, string> = {
    data: "Данные формы",
    contacts: "Контакты",
    generation: "Генерация",
    result: "Результат",
    share: "Поделиться"
  }

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
      toast.success("Контент сохранён!")
    } catch (err) {
      toast.error("Ошибка сохранения: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
    }
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
    <div className="py-4">
      <div className="space-y-6 sm:space-y-8">
        {/* Заголовок с выбором формы */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Редактор — {tabTitles[activeTab]}
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            {/* Выбор формы (если несколько) */}
            {forms.length > 1 && (
              <Select value={selectedFormId || ""} onValueChange={handleFormChange}>
                <SelectTrigger className="relative h-12 w-full sm:w-[280px] rounded-[18px] bg-white dark:bg-background border border-input hover:bg-accent/50 !justify-center [&>span]:text-center [&>svg]:absolute [&>svg]:right-3">
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
              <div className="h-12 px-4 flex items-center justify-center rounded-[18px] border border-input bg-white dark:bg-background">
                <span className="text-sm">{selectedForm?.name || "Форма"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Вкладки редактора */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
            <TabsTrigger
              value="data"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Данные формы
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Контакты
            </TabsTrigger>
            <TabsTrigger
              value="generation"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Генерация
            </TabsTrigger>
            <TabsTrigger
              value="result"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Результат
            </TabsTrigger>
            <TabsTrigger
              value="share"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Поделиться
            </TabsTrigger>
          </TabsList>

          <div className="pt-6 max-w-2xl">
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
              <ShareTab content={content} onChange={setContent} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Кнопки действий */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleSave}
            disabled={saveContentMutation.isPending || contentLoading}
            className="h-12 w-full sm:w-[200px] rounded-[18px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saveContentMutation.isPending ? "Сохранение..." : "Продолжить"}
          </Button>
          <Button
            onClick={handleSave}
            variant="outline"
            disabled={saveContentMutation.isPending || contentLoading}
            className="h-12 w-full sm:w-[200px] rounded-[18px]"
          >
            {saveContentMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  )
}
