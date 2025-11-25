"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Download } from "lucide-react"

interface SuccessStepProps {
  result: { type: string; text: string; imageUrl?: string }
  onRestart: () => void
}

export function SuccessStep({ result, onRestart }: SuccessStepProps) {
  const [content, setContent] = useState({
    title: "Your Recommendations",
    description: "We've sent a copy to your email",
    shareText: "I just got my personalized recommendations!",
  })

  useEffect(() => {
    const fetchContent = async () => {}

    fetchContent()
  }, [])

  const handleShare = async () => {
    const shareText = content.shareText
    const shareUrl = window.location.origin

    console.log("[v0] Attempting to share:", shareText, shareUrl)

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Lead Hero Recommendations",
          text: shareText,
          url: shareUrl,
        })
        console.log("[v0] Share successful")
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("[v0] Share error:", err)
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
          alert("Link copied to clipboard!")
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
        alert("Link copied to clipboard!")
        console.log("[v0] Link copied to clipboard")
      } catch (err) {
        console.error("[v0] Clipboard error:", err)
        alert("Could not copy link. Please copy manually: " + shareUrl)
      }
    }
  }

  const handleDownload = () => {
    const element = document.createElement("a")
    const file = new Blob([result.text], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = "recommendations.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500 w-full max-w-4xl">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{content.title}</h2>
        <p className="text-lg text-muted-foreground max-w-md">{content.description}</p>
      </div>

      <div className="w-full bg-card rounded-lg border border-border p-6">
        <div className="prose prose-invert max-w-none text-left">
          {result.type === "image" && result.imageUrl ? (
            <img
              src={result.imageUrl || "/placeholder.svg"}
              alt="Generated recommendation"
              className="w-full rounded"
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{result.text}</div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button onClick={handleShare} variant="outline" className="flex-1 h-12 bg-transparent">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button onClick={handleDownload} variant="outline" className="flex-1 h-12 bg-transparent">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button onClick={onRestart} className="flex-1 h-12">
          Check Another URL
        </Button>
      </div>
    </div>
  )
}
