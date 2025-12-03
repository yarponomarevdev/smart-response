"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Download } from "lucide-react"
import { jsPDF } from "jspdf"

interface SuccessStepProps {
  result: { type: string; text: string; imageUrl?: string }
  onRestart: () => void
}

export function SuccessStep({ result, onRestart }: SuccessStepProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleShare = async () => {
    const shareText = `Получил рекомендации! ${window.location.origin}`

    try {
      await navigator.clipboard.writeText(shareText)
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
      textArea.value = shareText
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
        tempContainer.style.whiteSpace = "pre-wrap"
        tempContainer.style.wordWrap = "break-word"
        
        // Добавляем заголовок и текст
        tempContainer.innerHTML = `
          <h1 style="font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">Ваши рекомендации</h1>
          <div style="white-space: pre-wrap; word-wrap: break-word;">${result.text.replace(/\n/g, "<br>")}</div>
        `
        
        document.body.appendChild(tempContainer)
        
        // Используем html2canvas если доступен, иначе используем простой canvas
        const renderToCanvas = async () => {
          try {
            // Пробуем использовать html2canvas если доступен
            if (typeof window !== "undefined" && (window as any).html2canvas) {
              const html2canvas = (window as any).html2canvas
              const canvas = await html2canvas(tempContainer, {
                backgroundColor: "#ffffff",
                scale: 2,
                useCORS: true,
              })
              
              const imgData = canvas.toDataURL("image/png")
              const imgWidth = canvas.width / 3.779527559 // конвертация пикселей в мм
              const imgHeight = canvas.height / 3.779527559
              
              // Если изображение не помещается на одну страницу, разбиваем на несколько
              let yPos = margin
              const maxHeight = pageHeight - margin * 2
              
              if (imgHeight <= maxHeight) {
                pdf.addImage(imgData, "PNG", margin, yPos, Math.min(imgWidth, maxWidth), imgHeight)
              } else {
                // Разбиваем на страницы
                const pages = Math.ceil(imgHeight / maxHeight)
                for (let i = 0; i < pages; i++) {
                  if (i > 0) pdf.addPage()
                  const sourceY = (i * maxHeight) * 3.779527559
                  const sourceHeight = Math.min(maxHeight * 3.779527559, canvas.height - sourceY)
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
              
              document.body.removeChild(tempContainer)
              pdf.save("recommendations.pdf")
              setDownloading(false)
              return
            }
          } catch (error) {
            console.error("html2canvas error:", error)
          }
          
          // Fallback: используем простой canvas для рендеринга текста
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          
          if (ctx) {
            const fontSize = 11
            const lineHeight = fontSize * 1.5
            ctx.font = `${fontSize}px Arial`
            ctx.fillStyle = "#000000"
            ctx.textBaseline = "top"
            
            // Рассчитываем размеры
            const textLines = result.text.split("\n")
            const maxWidthPx = maxWidth * 3.779527559
            let totalHeight = 30 // место для заголовка
            
            // Рассчитываем высоту текста
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
            ctx.fillText("Ваши рекомендации", 20, 10)
            
            ctx.font = `${fontSize}px Arial`
            let yPos = 30
            
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
            
            if (imgHeight <= pageHeight - margin * 2) {
              pdf.addImage(imgData, "PNG", margin, margin, Math.min(imgWidth, maxWidth), imgHeight)
            } else {
              // Разбиваем на страницы
              const maxHeight = pageHeight - margin * 2
              const pages = Math.ceil(imgHeight / maxHeight)
              for (let i = 0; i < pages; i++) {
                if (i > 0) pdf.addPage()
                const sourceY = (i * maxHeight) * 3.779527559
                const sourceHeight = Math.min(maxHeight * 3.779527559, canvas.height - sourceY)
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
          } else {
            // Последний fallback: стандартный метод jsPDF
            pdf.setFontSize(16)
            pdf.setFont("helvetica", "bold")
            pdf.text("Ваши рекомендации", margin, margin)
            
            pdf.setFontSize(11)
            pdf.setFont("helvetica", "normal")
            const lines = pdf.splitTextToSize(result.text, maxWidth)
            pdf.text(lines, margin, margin + 15)
          }
          
          document.body.removeChild(tempContainer)
          pdf.save("recommendations.pdf")
          setDownloading(false)
        }
        
        renderToCanvas()
      }
    } catch (error) {
      console.error("Download error:", error)
      // Fallback для изображения
      if (result.type === "image" && result.imageUrl) {
        window.open(result.imageUrl, "_blank")
      }
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-in fade-in duration-500 w-full max-w-4xl px-4">
      <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10">
        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Готово!</h2>
        <p className="text-base sm:text-lg text-muted-foreground max-w-md">Результаты также отправлены на вашу почту</p>
      </div>

      <div className="w-full bg-card rounded-lg border border-border p-4 sm:p-6">
        <div className="prose prose-invert max-w-none text-left">
          {result.type === "image" && result.imageUrl ? (
            <img src={result.imageUrl || "/placeholder.svg"} alt="Generated result" className="w-full rounded" />
          ) : (
            <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">{result.text}</div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md">
        <Button onClick={handleShare} variant="outline" className="flex-1 h-11 sm:h-12 bg-transparent text-sm sm:text-base">
          <Share2 className="mr-2 h-4 w-4" />
          {copied ? "Скопировано!" : "Поделиться"}
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex-1 h-11 sm:h-12 bg-transparent text-sm sm:text-base"
          disabled={downloading}
        >
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "Загрузка..." : "Скачать"}
        </Button>
        <Button onClick={onRestart} className="flex-1 h-11 sm:h-12 text-sm sm:text-base">
          Проверить другой URL
        </Button>
      </div>
    </div>
  )
}
