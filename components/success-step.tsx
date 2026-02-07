/**
 * SuccessStep - Экран результата
 * 
 * Показывает сгенерированный результат с кнопками действий.
 * Использует настройки из таблицы forms.
 */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Download } from "lucide-react"
import { jsPDF } from "jspdf"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { createClient } from "@/lib/supabase/client"
import { markdownToPdfContent, getPdfStyles } from "@/lib/utils/markdown-to-pdf"

interface SuccessStepProps {
  result: { type: string; text: string; imageUrl?: string }
  formId?: string
  email?: string
  onRestart: () => void
}

interface FormContent {
  result_title?: string
  result_download_text?: string
  result_share_text?: string
  result_restart_text?: string
  // CTA блок
  cta_text?: string
  button_text?: string
  button_url?: string
}

interface UsageInfo {
  usageCount: number
  remainingCount: number
  maxCount: number
  hasReachedLimit: boolean
}

export function SuccessStep({ result, formId, email, onRestart }: SuccessStepProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [content, setContent] = useState<FormContent>({})
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null)
  const [pdfMakeReady, setPdfMakeReady] = useState(false)

  // Динамически загружаем pdfMake только на клиенте
  useEffect(() => {
    const initPdfMake = async () => {
      const pdfMakeModule = await import("pdfmake/build/pdfmake")
      const pdfFontsModule = await import("pdfmake/build/vfs_fonts")
      
      const pdfMake = pdfMakeModule.default
      const pdfFonts = (pdfFontsModule as any).default || pdfFontsModule
      
      pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs || pdfFonts
      setPdfMakeReady(true)
    }
    
    initPdfMake()
  }, [])

  // Загрузка контента формы (теперь из таблицы forms)
  useEffect(() => {
    const fetchContent = async () => {
      if (!formId) return
      
      const supabase = createClient()
      const { data } = await supabase
        .from("forms")
        .select("result_title, share_button, download_button, cta_text, button_text, button_url")
        .eq("id", formId)
        .single()

      if (data) {
        setContent({
          result_title: data.result_title || undefined,
          result_download_text: data.download_button || undefined,
          result_share_text: data.share_button || undefined,
          cta_text: data.cta_text || undefined,
          button_text: data.button_text || undefined,
          button_url: data.button_url || undefined,
        })
      }
    }

    fetchContent()
  }, [formId])

  // Загрузка информации об использованиях
  useEffect(() => {
    const fetchUsageInfo = async () => {
      if (!formId || !email) return

      try {
        const response = await fetch(
          `/api/check-usage?formId=${encodeURIComponent(formId)}&email=${encodeURIComponent(email)}`
        )

        if (response.ok) {
          const data = await response.json()
          setUsageInfo(data)
        }
      } catch (error) {
        console.error("Ошибка получения информации об использовании:", error)
      }
    }

    fetchUsageInfo()
  }, [formId, email])

  // Извлекаем настройки из content
  const resultTitle = content.result_title || "Ваша персональная рекламная кампания готова!"
  const downloadText = content.result_download_text || "Скачать"
  const shareText = content.result_share_text || "Поделиться"
  const restartText = content.result_restart_text || "Проверить другой URL"
  const ctaText = content.cta_text || ""
  const buttonText = content.button_text || ""
  const buttonUrl = content.button_url || ""

  // Функция для удаления markdown разметки из текста
  const stripMarkdown = (text: string): string => {
    return text
      // Удаляем заголовки
      .replace(/^#{1,6}\s+/gm, '')
      // Удаляем жирный текст
      .replace(/\*\*(.+?)\*\*/g, '$1')
      // Удаляем курсив
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // Удаляем зачеркнутый текст
      .replace(/~~(.+?)~~/g, '$1')
      // Удаляем код
      .replace(/`(.+?)`/g, '$1')
      // Удаляем блоки кода
      .replace(/```[\s\S]*?```/g, '')
      // Удаляем ссылки [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Удаляем изображения ![alt](url)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Удаляем цитаты
      .replace(/^>\s+/gm, '')
      // Удаляем списки
      .replace(/^[\*\-\+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Удаляем лишние пробелы и переносы
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }


  const handleShare = async () => {
    // Подготавливаем контент для копирования в зависимости от типа результата
    let shareTextContent = ""
    
    if (result.type === "image" && result.imageUrl) {
      // Для изображения копируем URL
      shareTextContent = `Результат: ${result.imageUrl}`
    } else if (result.type === "image_with_text" && result.text) {
      // Для изображения с текстом копируем текст без markdown
      shareTextContent = stripMarkdown(result.text)
    } else {
      // Для текста копируем содержимое без markdown
      shareTextContent = stripMarkdown(result.text || "")
    }

    // Попытка поделиться файлом и текстом через Web Share API
    if (navigator.share && window.isSecureContext && result.imageUrl) {
      try {
        const imageUrl = result.imageUrl
        const response = await fetch(imageUrl, { mode: "cors" })
        const blob = await response.blob()
        const file = new File([blob], "result.png", { type: blob.type })
        
        const shareData = {
          title: resultTitle,
          text: shareTextContent,
          files: [file]
        }

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData)
          return // Успешно поделились
        }
      } catch (error) {
        console.warn("Не удалось поделиться изображением:", error)
        // Продолжаем выполнение для фоллбэка на текст
      }
    }

    try {
      await navigator.clipboard.writeText(shareTextContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      if (navigator.share && window.isSecureContext) {
        try {
          await navigator.share({
            title: resultTitle,
            text: shareTextContent,
          })
        } catch {
          // User cancelled
        }
      }
    } catch {
      const textArea = document.createElement("textarea")
      textArea.value = shareTextContent
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)

    try {
      if (result.type === "image" && result.imageUrl) {
        // Используем canvas для загрузки изображения (обход CORS)
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
          const canvas = document.createElement("canvas")
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0)

          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              const link = document.createElement("a")
              link.href = url
              link.download = "result.png"
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              URL.revokeObjectURL(url)
            }
            setDownloading(false)
          }, "image/png")
        }

        img.onerror = () => {
          // Fallback: открыть изображение в новой вкладке
          window.open(result.imageUrl, "_blank")
          setDownloading(false)
        }

        img.src = result.imageUrl
      } else if (result.type === "image_with_text" && result.imageUrl) {
        // Создаём PDF с изображением и текстом через pdfMake
        const pdfMakeModule = await import("pdfmake/build/pdfmake")
        const pdfMake = pdfMakeModule.default
        
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = async () => {
          const canvas = document.createElement("canvas")
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0)

          const imgData = canvas.toDataURL("image/png")
          
          // Конвертируем текст из markdown в pdfmake формат
          const textContent = result.text ? await markdownToPdfContent(result.text) : []
          
          const docDefinition = {
            content: [
              {
                image: imgData,
                width: 400,
                alignment: "center" as const,
                margin: [0, 0, 0, 20] as [number, number, number, number],
              },
              ...textContent,
            ],
            styles: getPdfStyles(),
            defaultStyle: {
              font: "Roboto",
            },
            pageMargins: [40, 60, 40, 60] as [number, number, number, number],
          }

          pdfMake.createPdf(docDefinition).download("result.pdf")
          setDownloading(false)
        }

        img.onerror = () => {
          window.open(result.imageUrl, "_blank")
          setDownloading(false)
        }

        img.src = result.imageUrl
      } else {
        // Download text as PDF с использованием pdfMake
        const pdfMakeModule = await import("pdfmake/build/pdfmake")
        const pdfMake = pdfMakeModule.default
        
        const content = await markdownToPdfContent(result.text)
        
        const docDefinition = {
          content: [
            {
              text: "Ваши рекомендации",
              style: "title",
            },
            ...content,
          ],
          styles: {
            title: {
              fontSize: 20,
              bold: true,
              margin: [0, 0, 0, 15] as [number, number, number, number],
            },
            ...getPdfStyles(),
          },
          defaultStyle: {
            font: "Roboto",
          },
          pageMargins: [40, 60, 40, 60] as [number, number, number, number],
        }

        pdfMake.createPdf(docDefinition).download("recommendations.pdf")
        setDownloading(false)
      }
    } catch (error) {
      console.error("Ошибка загрузки:", error)
      if (result.type === "image" && result.imageUrl) {
        window.open(result.imageUrl, "_blank")
      }
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-in fade-in duration-500 w-full max-w-4xl px-4">
      {/* Заголовок */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold">{resultTitle}</h2>
      </div>

      {/* Результат */}
      <div className="w-full bg-card rounded-lg border border-border p-4 sm:p-6">
        <div className="max-w-none text-left">
          {result.type === "image" && result.imageUrl ? (
            <img src={result.imageUrl || "/placeholder.svg"} alt="Generated result" className="w-full rounded" />
          ) : result.type === "image_with_text" && result.imageUrl ? (
            <div className="space-y-4">
              <img src={result.imageUrl || "/placeholder.svg"} alt="Generated result" className="w-full rounded" />
              {result.text && (
                <div className="pt-4 border-t border-border">
                  <MarkdownRenderer content={result.text} className="text-xs sm:text-sm" />
                </div>
              )}
            </div>
          ) : (
            <MarkdownRenderer content={result.text} className="text-xs sm:text-sm" />
          )}
        </div>
      </div>

      {/* Дисклеймер об использованиях - показывается только если установлен лимит (maxCount !== null) */}
      {usageInfo && usageInfo.maxCount !== null && usageInfo.usageCount > 0 && !usageInfo.hasReachedLimit && (
        <div className="w-full max-w-md p-4 bg-muted rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            Вы использовали форму {usageInfo.usageCount} из {usageInfo.maxCount} раз
            {usageInfo.remainingCount !== null && usageInfo.remainingCount > 0 && (
              <span> (осталось {usageInfo.remainingCount})</span>
            )}
          </p>
        </div>
      )}

      {/* Финальное сообщение при достижении лимита - при безлимите не показывается */}
      {usageInfo?.hasReachedLimit && (
        <div className="w-full max-w-md p-6 bg-primary/10 rounded-lg text-center space-y-4">
          <p className="text-sm font-medium">
            Вы воспользовались формой предельное количество раз. 
            Зарегистрируйтесь, создавайте свои формы и пользуйтесь ими 
            с расширенным количеством генераций — бесплатно.
          </p>
          <Button
            onClick={() => window.location.href = '/auth/register'}
            className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
          >
            Зарегистрироваться
          </Button>
        </div>
      )}

      {/* CTA блок */}
      {ctaText && (
        <div className="w-full max-w-md space-y-3">
          <p className="text-sm sm:text-base font-medium">{ctaText}</p>
          {buttonText && buttonUrl && (
            <Button
              variant="default"
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
              onClick={() => window.open(buttonUrl, "_blank")}
            >
              {buttonText}
            </Button>
          )}
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex flex-col gap-3 w-full max-w-md">
        <Button
          onClick={handleDownload}
          variant="outline"
          className="w-full h-12 sm:h-14 bg-transparent text-sm sm:text-base"
          disabled={downloading}
        >
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "Загрузка..." : downloadText}
        </Button>
        <Button onClick={handleShare} variant="outline" className="w-full h-12 sm:h-14 bg-transparent text-sm sm:text-base">
          <Share2 className="mr-2 h-4 w-4" />
          {copied ? "Скопировано!" : shareText}
        </Button>
      </div>
    </div>
  )
}
