"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/spinner"

interface LoadingStepProps {
  url: string
  leadId: string
  formId?: string
  onComplete: (result: { type: string; text: string; imageUrl?: string }) => void
}

export function LoadingStep({ url, leadId, formId, onComplete }: LoadingStepProps) {
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
      } else {
        // Fallback to old content table
        const { data } = await supabase
          .from("content")
          .select("key, value")
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
      console.log("[v0] Starting result generation...")

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            leadId,
            formId,
          }),
        })

        const data = await response.json()
        console.log("[v0] Generation response:", data)

        if (data.success && data.result) {
          setTimeout(() => {
            onComplete(data.result)
          }, 1000)
        } else {
          console.error("[v0] Generation failed:", data.error)
        }
      } catch (error) {
        console.error("[v0] Error calling generate API:", error)
      }
    }

    generateResult()

    return () => clearInterval(messageInterval)
  }, [url, leadId, formId, onComplete, messages])

  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
      <Spinner className="h-16 w-16" />
      <p className="text-xl text-muted-foreground animate-pulse">{messages[messageIndex]}</p>
    </div>
  )
}
