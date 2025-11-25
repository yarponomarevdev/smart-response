"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/spinner"

interface LoadingStepProps {
  url: string
  leadId: string
  apartmentSize: number
  onComplete: (result: { type: string; text: string }) => void
}

export function LoadingStep({ url, leadId, apartmentSize, onComplete }: LoadingStepProps) {
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
      const { data } = await supabase.from("content").select("value").eq("key", "loading_messages").single()

      if (data?.value.messages) {
        setMessages(data.value.messages)
      }
    }

    fetchMessages()
  }, [])

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
            apartmentSize,
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
  }, [url, leadId, apartmentSize, onComplete, messages])

  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
      <Spinner className="h-16 w-16" />
      <p className="text-xl text-muted-foreground animate-pulse">{messages[messageIndex]}</p>
    </div>
  )
}
