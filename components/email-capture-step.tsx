"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

interface EmailCaptureStepProps {
  leadId: string
  result: { type: string; text: string }
  onSuccess: () => void
}

export function EmailCaptureStep({ leadId, result, onSuccess }: EmailCaptureStepProps) {
  const [email, setEmail] = useState("")
  const [isValid, setIsValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState({
    title: "Want to save your recommendations?",
    description: "Enter your email to receive a copy of your personalized design recommendations",
  })

  useEffect(() => {
    const fetchContent = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("content").select("value").in("key", ["cta_title", "cta_description"])

      if (data && data.length >= 2) {
        setContent({
          title: data[0]?.value.text || content.title,
          description: data[1]?.value.text || content.description,
        })
      }
    }

    fetchContent()
  }, [])

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const handleChange = (value: string) => {
    setEmail(value)
    setIsValid(validateEmail(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || isLoading) return

    setIsLoading(true)

    const supabase = createClient()

    const { data: leadData, error: updateError } = await supabase
      .from("leads")
      .update({ email })
      .eq("id", leadId)
      .select()
      .single()

    if (!updateError && leadData) {
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            result: result.text,
            url: leadData.url,
          }),
        })
      } catch (error) {
        console.error("[v0] Error sending email:", error)
      }

      setTimeout(() => {
        onSuccess()
      }, 500)
    } else {
      console.error("[v0] Error updating lead:", updateError)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{content.title}</h2>
        <p className="text-lg text-muted-foreground max-w-md">{content.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => handleChange(e.target.value)}
          className="h-14 text-lg px-6 bg-card border-border"
          disabled={isLoading}
        />
        <Button type="submit" disabled={!isValid || isLoading} className="w-full h-14 text-lg font-semibold">
          {isLoading ? "Sending..." : "Send Me Recommendations"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">We respect your privacy. No spam, ever.</p>
    </div>
  )
}
