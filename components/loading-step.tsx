"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/spinner"

interface LoadingStepProps {
  url: string
  formId?: string
  onComplete: (result: { type: string; text: string; imageUrl?: string }) => void
}

export function LoadingStep({ url, formId, onComplete }: LoadingStepProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [messages, setMessages] = useState([
    "Analyzing your link...",
    "Processing information...",
    "Generating recommendations...",
    "Almost done...",
  ])

  useEffect(() => {
    const fetchMessages = async () => {
      const supabase = createClient()

      if (formId) {
        const { data } = await supabase
          .from("form_content")
          .select("key, value")
          .eq("form_id", formId)
          .in("key", ["loading_message_1", "loading_message_2", "loading_message_3"])

        if (data && data.length > 0) {
          const loadedMessages = data
            .sort((a, b) => a.key.localeCompare(b.key))
            .map((item) => item.value)
            .filter((msg) => msg && msg.length > 0)

          if (loadedMessages.length > 0) {
            setMessages(loadedMessages)
          }
        }
      }
    }

    fetchMessages()
  }, [formId])

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 1500)

    const generateResult = async () => {
      try {
        // Используем абсолютный URL для работы в iframe на внешних сайтах
        const apiUrl = typeof window !== "undefined" ? `${window.location.origin}/api/generate` : "/api/generate"
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          console.error("[v0] Generation failed:", errorData)
          throw new Error(errorData.error || errorData.details || "Failed to generate result")
        }

        const data = await response.json()

        if (data.success && data.result) {
          setTimeout(() => {
            onComplete(data.result)
          }, 1000)
        } else {
          console.error("[v0] Generation failed:", data.error || data.details)
          throw new Error(data.error || data.details || "Failed to generate result")
        }
      } catch (error) {
        console.error("[v0] Error calling generate API:", error)
        // Показываем ошибку пользователю
        if (error instanceof Error) {
          console.error("[v0] Error details:", error.message)
        }
      }
    }

    generateResult()

    return () => clearInterval(messageInterval)
  }, [url, formId, onComplete, messages])

  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
      <Spinner className="h-16 w-16" />
      <p className="text-xl text-muted-foreground animate-pulse">{messages[messageIndex]}</p>
    </div>
  )
}
