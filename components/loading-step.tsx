"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/spinner"

interface LoadingStepProps {
  url: string
  leadId: string
  formId?: string // Added formId prop
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

      let query
      if (formId) {
        query = supabase
          .from("form_content")
          .select("value")
          .eq("form_id", formId)
          .eq("key", "loading_messages")
          .single()
      } else {
        query = supabase.from("content").select("value").eq("key", "loading_messages").single()
      }

      const { data } = await query

      if (data?.value.messages) {
        setMessages(data.value.messages)
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
