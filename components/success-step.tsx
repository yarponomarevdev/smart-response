/**
 * SuccessStep - Экран результата
 * 
 * Показывает сгенерированный результат с кнопками действий.
 * Использует настройки из form_content.
 */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Download } from "lucide-react"
import { jsPDF } from "jspdf"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { marked } from "marked"
import { createClient } from "@/lib/supabase/client"

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

  // Загрузка контента формы
  useEffect(() => {
    const fetchContent = async () => {
      if (!formId) return
      
      const supabase = createClient()
      const { data } = await supabase
        .from("form_content")
        .select("key, value")
        .eq("form_id", formId)
        .in("key", [
          "result_title",
          "result_download_text",
          "result_share_text",
          "result_restart_text",
          "cta_text",
          "button_text",
          "button_url",
        ])

      if (data && data.length > 0) {
        const contentMap: FormContent = {}
        data.forEach((item) => {
          (contentMap as Record<string, string>)[item.key] = item.value
        })
        setContent(contentMap)
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

  const handleShare = async () => {
    const shareTextContent = `Получил рекомендации! ${window.location.origin}`

    try {
      await navigator.clipboard.writeText(shareTextContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      if (navigator.share && window.isSecureContext) {
        try {
          await navigator.share({
            title: "Lead Hero",
            text: "Получил персональные рекомендации!",
            url: window.location.origin,
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
        // Создаём PDF с изображением и текстом
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        })

        const pageWidth = pdf.internal.pageSize.getWidth()
        const margin = 20
        const maxWidth = pageWidth - margin * 2

        // Загружаем изображение
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = async () => {
          const canvas = document.createElement("canvas")
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0)

          const imgData = canvas.toDataURL("image/png")
          
          // Рассчитываем размеры изображения для PDF
          const imgAspectRatio = img.naturalWidth / img.naturalHeight
          const imgWidthMm = Math.min(maxWidth, 120)
          const imgHeightMm = imgWidthMm / imgAspectRatio

          // Добавляем изображение
          pdf.addImage(imgData, "PNG", margin, margin, imgWidthMm, imgHeightMm)

          // Добавляем текст под изображением
          if (result.text) {
            const textStartY = margin + imgHeightMm + 15
            const fontSize = 11
            const lineHeight = fontSize * 0.5
            
            pdf.setFontSize(fontSize)
            pdf.setTextColor(0, 0, 0)

            // Простая обработка текста
            const plainText = result.text.replace(/[#*_`]/g, "").trim()
            const lines = pdf.splitTextToSize(plainText, maxWidth)
            
            pdf.text(lines, margin, textStartY)
          }

          pdf.save("result.pdf")
          setDownloading(false)
        }

        img.onerror = () => {
          window.open(result.imageUrl, "_blank")
          setDownloading(false)
        }

        img.src = result.imageUrl
      } else {
        // Download text as PDF с поддержкой кириллицы через canvas
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        })
        
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const margin = 20
        const maxWidth = pageWidth - margin * 2
        
        // Настраиваем marked для правильной обработки списков
        marked.setOptions({
          breaks: true,
          gfm: true,
        })
        
        // Конвертируем markdown в HTML для PDF
        const htmlContent = await marked(result.text)
        
        // Создаем временный контейнер для рендеринга текста
        const tempContainer = document.createElement("div")
        tempContainer.style.position = "absolute"
        tempContainer.style.left = "-9999px"
        tempContainer.style.width = `${maxWidth}mm`
        tempContainer.style.padding = "20px"
        tempContainer.style.fontSize = "11px"
        tempContainer.style.fontFamily = "Arial, sans-serif"
        tempContainer.style.color = "#000000"
        tempContainer.style.backgroundColor = "#ffffff"
        tempContainer.style.lineHeight = "1.5"
        
        // Добавляем заголовок и конвертированный markdown
        tempContainer.innerHTML = `
          <h1 style="font-size: 16px; font-weight: bold; margin: 10px 0 10px 0; padding-top: 10px;">Ваши рекомендации</h1>
          <div style="word-wrap: break-word;">
            <style>
              h1 { font-size: 16px; font-weight: bold; margin: 10px 0; padding-top: 10px; }
              h2, h3, h4 { page-break-inside: avoid; break-inside: avoid; white-space: normal; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.4; margin-top: 12px; margin-bottom: 8px; font-weight: bold; }
              h2 { font-size: 14px; }
              h3 { font-size: 13px; }
              h4 { font-size: 12px; }
              p { white-space: normal; word-wrap: break-word; margin: 8px 0; line-height: 1.5; }
              ul, ol { margin: 8px 0; padding-left: 24px; line-height: 1.5; }
              ul { list-style-type: disc; list-style-position: outside; }
              ol { list-style-type: decimal; list-style-position: outside; }
              li { margin: 4px 0; padding-left: 4px; word-wrap: break-word; white-space: normal; display: list-item; }
              strong { font-weight: bold; }
              em { font-style: italic; }
              code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 10px; }
              blockquote { border-left: 3px solid #59191f; padding-left: 12px; margin: 8px 0; font-style: italic; color: #666; }
            </style>
            ${htmlContent}
          </div>
        `
        
        document.body.appendChild(tempContainer)
        
        // Используем простой canvas для рендеринга текста
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        
        if (ctx) {
          const fontSize = 11
          const lineHeight = fontSize * 1.5
          ctx.font = `${fontSize}px Arial`
          ctx.fillStyle = "#000000"
          ctx.textBaseline = "top"
          
          // Конвертируем markdown в простой текст для canvas
          const htmlContentParsed = await marked(result.text)
          const tempDiv = document.createElement("div")
          tempDiv.innerHTML = htmlContentParsed
          
          // Извлекаем текст, сохраняя структуру списков
          let plainText = ""
          const processNode = (node: Node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as Element
              const tagName = el.tagName.toLowerCase()
              
              if (tagName === "ol" || tagName === "ul") {
                const items = el.querySelectorAll("li")
                items.forEach((item, index) => {
                  const prefix = tagName === "ol" ? `${index + 1}. ` : "• "
                  plainText += prefix + (item.textContent || "") + "\n"
                })
              } else if (tagName === "li") {
                return
              } else {
                Array.from(node.childNodes).forEach(processNode)
              }
            } else if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent || ""
              if (text.trim()) {
                plainText += text
              }
            } else {
              Array.from(node.childNodes).forEach(processNode)
            }
          }
          
          processNode(tempDiv)
          
          if (!plainText) {
            plainText = tempDiv.textContent || tempDiv.innerText || result.text
          }
          
          // Рассчитываем размеры
          const textLines = plainText.split("\n")
          const maxWidthPx = maxWidth * 3.779527559
          let totalHeight = 50
          
          for (const line of textLines) {
            const words = line.split(" ")
            let currentLine = ""
            
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word
              const testWidth = ctx.measureText(testLine).width
              
              if (testWidth > maxWidthPx && currentLine) {
                totalHeight += lineHeight
                currentLine = word
              } else {
                currentLine = testLine
              }
            }
            if (currentLine) totalHeight += lineHeight
          }
          
          canvas.width = Math.ceil(maxWidthPx) + 40
          canvas.height = Math.max(totalHeight, 200)
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = "#000000"
          ctx.font = `bold ${16}px Arial`
          ctx.fillText("Ваши рекомендации", 20, 20)
          
          ctx.font = `${fontSize}px Arial`
          let yPos = 40
          
          for (const line of textLines) {
            if (!line.trim()) {
              yPos += lineHeight * 0.5
              continue
            }
            
            const words = line.split(" ")
            let currentLine = ""
            
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word
              const testWidth = ctx.measureText(testLine).width
              
              if (testWidth > maxWidthPx && currentLine) {
                ctx.fillText(currentLine, 20, yPos)
                yPos += lineHeight
                currentLine = word
              } else {
                currentLine = testLine
              }
            }
            
            if (currentLine) {
              ctx.fillText(currentLine, 20, yPos)
              yPos += lineHeight
            }
          }
          
          const imgData = canvas.toDataURL("image/png")
          const imgWidth = canvas.width / 3.779527559
          const imgHeight = canvas.height / 3.779527559
          
          const maxHeight = pageHeight - margin * 2
          if (imgHeight <= maxHeight) {
            pdf.addImage(imgData, "PNG", margin, margin, Math.min(imgWidth, maxWidth), imgHeight)
          } else {
            const pages = Math.ceil(imgHeight / maxHeight)
            for (let i = 0; i < pages; i++) {
              if (i > 0) pdf.addPage()
              const sourceY = i === 0 ? 0 : (i * maxHeight) * 3.779527559
              const remainingHeight = canvas.height - sourceY
              const sourceHeight = Math.min(maxHeight * 3.779527559, remainingHeight)
              const destHeight = sourceHeight / 3.779527559
              
              const pageCanvas = document.createElement("canvas")
              pageCanvas.width = canvas.width
              pageCanvas.height = sourceHeight
              const pageCtx = pageCanvas.getContext("2d")
              if (pageCtx) {
                pageCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight)
                const pageImgData = pageCanvas.toDataURL("image/png")
                pdf.addImage(pageImgData, "PNG", margin, margin, Math.min(imgWidth, maxWidth), destHeight)
              }
            }
          }
        }
        
        document.body.removeChild(tempContainer)
        pdf.save("recommendations.pdf")
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

      {/* Дисклеймер об использованиях */}
      {usageInfo && usageInfo.usageCount > 0 && !usageInfo.hasReachedLimit && (
        <div className="w-full max-w-md p-4 bg-muted rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            Вы использовали форму {usageInfo.usageCount} из {usageInfo.maxCount} раз
            {usageInfo.remainingCount > 0 && (
              <span> (осталось {usageInfo.remainingCount})</span>
            )}
          </p>
        </div>
      )}

      {/* Финальное сообщение при достижении лимита */}
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
