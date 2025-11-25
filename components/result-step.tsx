"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface ResultStepProps {
  result: { type: string; text: string; imageUrl?: string }
  onContinue: () => void
}

export function ResultStep({ result, onContinue }: ResultStepProps) {
  const [content, setContent] = useState({
    title: "Your Personalized Recommendations",
  })

  useEffect(() => {
    const fetchContent = async () => {
      const supabase = createClient()
    }

    fetchContent()
  }, [])

  const generatePreview = (text: string, maxLength = 200) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const previewText = result.type === "text" ? generatePreview(result.text) : ""

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
    <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500 w-full">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{content.title}</h2>
        <p className="text-muted-foreground">Here's a preview of your recommendations</p>
      </div>

      <div className="w-full max-w-2xl">
        <div className="bg-card rounded border border-border p-6">
          <div className="prose prose-invert max-w-none text-left">
            {result.type === "image" && result.imageUrl ? (
              <div className="relative">
                <img
                  src={result.imageUrl || "/placeholder.svg"}
                  alt="Generated recommendation"
                  className="w-full rounded blur-sm"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                  <p className="text-white font-semibold">Enter email to see full image</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{previewText}</p>
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground italic">
                    Full recommendations will be sent to your email and displayed below
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-muted-foreground mb-4">Enter your email to see the full results</p>
          <Button onClick={onContinue} className="w-full max-w-md h-14 text-lg font-semibold">
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
