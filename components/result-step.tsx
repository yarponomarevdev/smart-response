"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Download } from "lucide-react"

interface ResultStepProps {
  result: { type: string; text: string }
  onContinue: () => void
}

export function ResultStep({ result, onContinue }: ResultStepProps) {
  const [isBlurred, setIsBlurred] = useState(true)
  const [content, setContent] = useState({
    title: "Your Personalized Recommendations",
    description: "Based on your inspiration and apartment size",
  })

  useEffect(() => {
    const fetchContent = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("content").select("value").in("key", ["result_title", "result_description"])

      if (data && data.length >= 2) {
        setContent({
          title: data[0]?.value.text || content.title,
          description: data[1]?.value.text || content.description,
        })
      }
    }

    fetchContent()
  }, [])

  const handleReveal = () => {
    setIsBlurred(false)
  }

  const handleDownload = () => {
    const element = document.createElement("a")
    const file = new Blob([result.text], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = "interior-design-recommendations.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500 w-full">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{content.title}</h2>
        <p className="text-muted-foreground">{content.description}</p>
      </div>

      <div className="w-full max-w-2xl">
        <div
          className={`relative bg-card rounded border border-border p-6 transition-all duration-500 ${isBlurred ? "blur-md" : ""}`}
        >
          <div className="prose prose-invert max-w-none text-left">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.text}</p>
          </div>
        </div>

        {isBlurred && (
          <div className="mt-6">
            <Button onClick={handleReveal} className="w-full max-w-md h-14 text-lg font-semibold">
              Reveal Recommendations
            </Button>
          </div>
        )}
      </div>

      {!isBlurred && (
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Button onClick={handleDownload} variant="outline" className="flex-1 h-12 bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={onContinue} className="flex-1 h-12">
            Save to Email
          </Button>
        </div>
      )}
    </div>
  )
}
