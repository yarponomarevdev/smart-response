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
        // Download text as PDF
        const pdf = new jsPDF()
        const pageWidth = pdf.internal.pageSize.getWidth()
        const margin = 20
        const maxWidth = pageWidth - margin * 2

        pdf.setFontSize(16)
        pdf.text("Ваши рекомендации", margin, margin)

        pdf.setFontSize(11)
        const lines = pdf.splitTextToSize(result.text, maxWidth)
        pdf.text(lines, margin, margin + 15)

        pdf.save("recommendations.pdf")
        setDownloading(false)
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
