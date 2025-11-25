"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Share2 } from "lucide-react"

interface SuccessStepProps {
  onRestart: () => void
}

export function SuccessStep({ onRestart }: SuccessStepProps) {
  const [content, setContent] = useState({
    title: "Thank you!",
    description: "Check your email for your personalized recommendations",
    shareText: "I just got my personalized interior design recommendations!",
  })

  useEffect(() => {
    const fetchContent = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("content")
        .select("value")
        .in("key", ["success_title", "success_description", "social_share_text"])

      if (data && data.length >= 3) {
        setContent({
          title: data[0]?.value.text || content.title,
          description: data[1]?.value.text || content.description,
          shareText: data[2]?.value.text || content.shareText,
        })
      }
    }

    fetchContent()
  }, [])

  const handleShare = async () => {
    const shareData = {
      title: "Interior Design Recommendations",
      text: content.shareText,
      url: window.location.origin,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log("Share cancelled")
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
    }
  }

  return (
    <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{content.title}</h2>
        <p className="text-lg text-muted-foreground max-w-md">{content.description}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button onClick={handleShare} variant="outline" className="flex-1 h-12 bg-transparent">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button onClick={onRestart} className="flex-1 h-12">
          Check Another URL
        </Button>
      </div>
    </div>
  )
}
