/**
 * GenerationTab - Вкладка "Генерация"
 * Содержит настройки AI: системный промпт, формат результата, сообщения загрузки
 * С автосохранением каждого поля
 */
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AutoSaveFieldWrapper, SaveStatusIndicator } from "@/components/ui/auto-save-input"
import { useAutoSaveField, useAutoSaveBoolean, useAutoSaveArray } from "@/lib/hooks/use-autosave"
import { Label } from "@/components/ui/label"
import { useKnowledgeFiles, useUploadKnowledgeFile, useDeleteKnowledgeFile, formatFileSize } from "@/lib/hooks/use-knowledge-files"
import { Loader2, Sparkles, Upload, X, FileText, FileSpreadsheet, FileJson, File, ImageIcon, Settings2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

interface GenerationTabProps {
  formId: string | null
  systemPrompt: string
  loadingMessages: string[]
  content: Record<string, string>
}

// Максимальное количество файлов
const MAX_FILES = 10

// Разрешённые расширения файлов (документы + изображения)
const ALLOWED_EXTENSIONS = [
  ".pdf", ".docx", ".doc", ".txt", ".md", ".csv", ".json",
  ".png", ".jpeg", ".jpg", ".webp", ".gif", ".heic"
]

export function GenerationTab({
  formId,
  systemPrompt: initialSystemPrompt,
  loadingMessages: initialLoadingMessages,
  content,
}: GenerationTabProps) {
  const { t } = useTranslation()
  
  // Автосохранение системного промпта
  const systemPrompt = useAutoSaveField({
    formId,
    fieldKey: "ai_system_prompt",
    initialValue: initialSystemPrompt,
    debounceMs: 800, // Чуть больше debounce для большого текста
  })

  // Автосохранение loading messages (массив)
  const loadingMessages = useAutoSaveArray({
    formId,
    fieldKey: "loading_messages",
    initialValue: initialLoadingMessages.length >= 3 
      ? initialLoadingMessages.slice(0, 3)
      : [...initialLoadingMessages, ...Array(3 - initialLoadingMessages.length).fill("")],
  })

  // Автосохранение ссылки на базу знаний
  const knowledgeUrl = useAutoSaveField({
    formId,
    fieldKey: "knowledge_url",
    initialValue: content.knowledge_url || "",
  })

  // Автосохранение формата результата (без debounce для немедленного сохранения)
  const resultFormat = useAutoSaveField({
    formId,
    fieldKey: "ai_result_format",
    initialValue: content.ai_result_format || "text",
    debounceMs: 100, // Небольшая задержка для избежания конфликтов
  })

  // Автосохранение чекбокса базы знаний
  const useKnowledgeBase = useAutoSaveBoolean({
    formId,
    fieldKey: "use_knowledge_base",
    initialValue: content.use_knowledge_base === "true",
  })

  // Хуки для работы с файлами
  const { data: files = [], isLoading: filesLoading } = useKnowledgeFiles(formId)
  const uploadFile = useUploadKnowledgeFile()
  const deleteFile = useDeleteKnowledgeFile()

  // Состояние для кнопки "Улучшить с AI"
  const [isImproving, setIsImproving] = useState(false)

  // Состояние для drag-and-drop
  const [isDragging, setIsDragging] = useState(false)

  // Ref для textarea с автоматическим расширением
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Ref для скрытого input файла
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Автоматическое расширение textarea по высоте
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const updateHeight = () => {
      // Сбрасываем высоту для корректного расчета scrollHeight
      textarea.style.height = "auto"
      // Устанавливаем высоту на основе содержимого
      textarea.style.height = `${textarea.scrollHeight}px`
    }

    updateHeight()

    // Обновляем высоту при изменении размера окна
    window.addEventListener("resize", updateHeight)
    return () => window.removeEventListener("resize", updateHeight)
  }, [systemPrompt.value])

  const handleImprovePrompt = async () => {
    if (!systemPrompt.value.trim()) return

    setIsImproving(true)
    try {
      const response = await fetch("/api/improve-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: systemPrompt.value }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Ошибка улучшения промпта:", data.error)
        alert(data.error || "Не удалось улучшить промпт")
        return
      }

      if (data.improvedPrompt) {
        systemPrompt.onChange(data.improvedPrompt)
      }
    } catch (error) {
      console.error("Ошибка при вызове API:", error)
      alert("Произошла ошибка при улучшении промпта")
    } finally {
      setIsImproving(false)
    }
  }

  // Обработка загрузки файлов
  const handleFileUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList || !formId) return

    // Проверяем лимит файлов
    if (files.length >= MAX_FILES) {
      alert(t("editor.generationTab.fileLimit").replace("{max}", String(MAX_FILES)))
      return
    }

    const filesToUpload = Array.from(fileList).slice(0, MAX_FILES - files.length)

    for (const file of filesToUpload) {
      // Проверяем расширение
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        alert(
          t("editor.generationTab.unsupportedFormat")
            .replace("{name}", file.name)
            .replace("{formats}", ALLOWED_EXTENSIONS.join(", "))
        )
        continue
      }

      try {
        await uploadFile.mutateAsync({ formId, file })
      } catch (error) {
        console.error("Ошибка загрузки файла:", error)
        alert(error instanceof Error ? error.message : "Ошибка загрузки файла")
      }
    }
  }, [formId, files.length, uploadFile])

  // Обработка удаления файла
  const handleDeleteFile = useCallback(async (fileId: string) => {
    if (!formId) return

    if (!confirm(t("editor.generationTab.deleteFile"))) return

    try {
      await deleteFile.mutateAsync({ fileId, formId })
    } catch (error) {
      console.error("Ошибка удаления файла:", error)
      alert(error instanceof Error ? error.message : "Ошибка удаления файла")
    }
  }, [formId, deleteFile])

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFileUpload(e.dataTransfer.files)
  }, [handleFileUpload])

  // Получение иконки для типа файла
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "pdf":
      case "doc":
      case "docx":
      case "txt":
      case "md":
        return <FileText className="h-4 w-4" />
      case "csv":
        return <FileSpreadsheet className="h-4 w-4" />
      case "json":
        return <FileJson className="h-4 w-4" />
      case "png":
      case "jpeg":
      case "jpg":
      case "webp":
      case "gif":
      case "heic":
        return <ImageIcon className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mr-auto pb-10">
      {/* Генерация ответа */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t("editor.generationTab.responseGeneration")}
          </CardTitle>
          <CardDescription>
            Настройте промпт и формат ответа AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AutoSaveFieldWrapper
            label={t("editor.generationTab.promptLabel")}
            labelFor="system_prompt"
            status={systemPrompt.status}
          >
            <div className="flex items-center justify-end mb-2 gap-3">
              <span className="text-sm text-muted-foreground">
                {t("editor.generationTab.improveWithAIComingSoon")}
              </span>
              <Button
                variant="default"
                onClick={handleImprovePrompt}
                disabled={true}
                className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[30px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 text-sm sm:text-base opacity-50 cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4" />
                {t("editor.generationTab.improveWithAI")}
              </Button>
            </div>
            <Textarea
              ref={textareaRef}
              id="system_prompt"
              value={systemPrompt.value}
              onChange={(e) => systemPrompt.onChange(e.target.value)}
              placeholder={t("editor.generationTab.promptPlaceholder")}
              rows={6}
              className="min-h-[150px] sm:min-h-[242px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6 py-4 resize-none overflow-hidden"
              style={{ height: "auto" }}
            />
          </AutoSaveFieldWrapper>

          {/* Формат результата */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-4">
              <Label className="text-base sm:text-lg">{t("editor.generationTab.resultFormat")}</Label>
              <SaveStatusIndicator status={resultFormat.status} />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="format_text"
                  checked={resultFormat.value === "text"}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      resultFormat.onChange("text")
                    }
                  }}
                  className="h-6 w-6 rounded-[5px]"
                />
                <Label 
                  htmlFor="format_text" 
                  className="text-base sm:text-lg cursor-pointer"
                >
                  {t("editor.generationTab.formatText")}
                </Label>
              </div>
              {/* Премиум — coming soon */}
              <div className="flex items-center gap-3 opacity-70">
                <Checkbox
                  id="format_image"
                  checked={resultFormat.value === "image"}
                  onCheckedChange={() => {}}
                  disabled
                  className="h-6 w-6 rounded-[5px]"
                />
                <Label 
                  htmlFor="format_image" 
                  className="text-base sm:text-lg cursor-not-allowed"
                >
                  {t("editor.generationTab.formatImage")}
                </Label>
                <span className="text-xs text-muted-foreground font-medium">
                  {t("editor.generationTab.comingSoonPremium")}
                </span>
              </div>
              <div className="flex items-center gap-3 opacity-70">
                <Checkbox
                  id="format_image_with_text"
                  checked={resultFormat.value === "image_with_text"}
                  onCheckedChange={() => {}}
                  disabled
                  className="h-6 w-6 rounded-[5px]"
                />
                <Label 
                  htmlFor="format_image_with_text" 
                  className="text-base sm:text-lg cursor-not-allowed"
                >
                  {t("editor.generationTab.formatImageWithText")}
                </Label>
                <span className="text-xs text-muted-foreground font-medium">
                  {t("editor.generationTab.comingSoonPremium")}
                </span>
              </div>
              <div className="flex items-center gap-3 opacity-70">
                <Checkbox
                  id="format_video"
                  checked={false}
                  onCheckedChange={() => {}}
                  disabled
                  className="h-6 w-6 rounded-[5px]"
                />
                <Label 
                  htmlFor="format_video" 
                  className="text-base sm:text-lg cursor-not-allowed"
                >
                  {t("editor.generationTab.formatVideo")}
                </Label>
                <span className="text-xs text-muted-foreground font-medium">
                  {t("editor.generationTab.comingSoonPremium")}
                </span>
              </div>
              <div className="flex items-center gap-3 opacity-70">
                <Checkbox
                  id="format_audio"
                  checked={false}
                  onCheckedChange={() => {}}
                  disabled
                  className="h-6 w-6 rounded-[5px]"
                />
                <Label 
                  htmlFor="format_audio" 
                  className="text-base sm:text-lg cursor-not-allowed"
                >
                  {t("editor.generationTab.formatAudio")}
                </Label>
                <span className="text-xs text-muted-foreground font-medium">
                  {t("editor.generationTab.comingSoonPremium")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Процесс генерации */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Loader2 className="h-5 w-5" />
            {t("editor.generationTab.generationProcess")}
          </CardTitle>
          <CardDescription>
            {t("editor.generationTab.generationHint")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Три поля в ряд */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {loadingMessages.values.map((value, index) => (
              <AutoSaveFieldWrapper
                key={index}
                label={`${t("editor.generationTab.field")} ${index + 1}`}
                labelFor={`loading_${index}`}
                status={loadingMessages.getStatusAt(index)}
              >
                <Input
                  id={`loading_${index}`}
                  value={value}
                  onChange={(e) => loadingMessages.onChangeAt(index, e.target.value)}
                  placeholder={index === 0 ? "Анализируем сайт..." : index === 1 ? "Генерируем рекомендации..." : "Почти готово..."}
                  className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
                />
              </AutoSaveFieldWrapper>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Доп. настройки */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t("editor.generationTab.additionalSettings")}
          </CardTitle>
          <CardDescription>
            Настройки базы знаний и источников данных
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Чекбокс базы знаний */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="use_knowledge_base"
              checked={useKnowledgeBase.value}
              onCheckedChange={(checked) => useKnowledgeBase.onChange(checked === true)}
              className="h-6 w-6 rounded-[5px]"
            />
            <label htmlFor="use_knowledge_base" className="text-base sm:text-lg cursor-pointer">
              {t("editor.generationTab.useKnowledgeBase")}
            </label>
          </div>

          {/* База знаний / Другие данные */}
          <div className="space-y-2">
            <label className="text-base sm:text-lg">{t("editor.generationTab.knowledgeBase")}</label>
            
            {/* Скрытый input для файлов */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />

            {/* Область загрузки с drag-and-drop */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-[18px] p-4 transition-colors
                ${isDragging 
                  ? "border-black dark:border-white bg-black/5 dark:bg-white/5" 
                  : "border-[#e0e0e0] dark:border-muted"
                }
              `}
            >
              <Button
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= MAX_FILES || uploadFile.isPending}
                className="w-full h-14 rounded-[18px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 text-base sm:text-lg"
              >
                {uploadFile.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {t("editor.generationTab.uploading")}
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    {t("editor.generationTab.uploadFile")}
                  </>
                )}
              </Button>
              
              <p className="text-center text-sm text-muted-foreground mt-2">
                {t("editor.generationTab.dragFilesHere")}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                {t("editor.generationTab.fileFormats").replace("{max}", String(MAX_FILES))}
              </p>
            </div>

            {/* Список загруженных файлов */}
            <div className="space-y-2 pt-2">
              {filesLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t("editor.generationTab.loadingFiles")}</span>
                </div>
              ) : files.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">{t("editor.generationTab.noFiles")}</p>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-2 p-3 bg-[#f4f4f4] dark:bg-muted rounded-[12px] group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(file.file_name)}
                      <span className="text-sm truncate">{file.file_name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatFileSize(file.file_size)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={deleteFile.isPending}
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                    >
                      {deleteFile.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Счётчик файлов */}
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("editor.generationTab.uploaded").replace("{count}", String(files.length)).replace("{max}", String(MAX_FILES))}
              </p>
            )}
          </div>

          {/* Ссылка */}
          <AutoSaveFieldWrapper
            label={
              <span className="flex items-center gap-2">
                {t("editor.generationTab.link")}
                <span className="text-sm text-muted-foreground font-normal">
                  ({t("editor.generationTab.linkComingSoon")})
                </span>
              </span>
            }
            labelFor="knowledge_url"
            status={knowledgeUrl.status}
          >
            <Input
              id="knowledge_url"
              value={knowledgeUrl.value}
              onChange={(e) => knowledgeUrl.onChange(e.target.value)}
              placeholder={t("editor.generationTab.linkPlaceholder")}
              disabled={true}
              className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6 opacity-60 cursor-not-allowed"
            />
          </AutoSaveFieldWrapper>
        </CardContent>
      </Card>
    </div>
  )
}
