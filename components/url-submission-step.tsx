"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface URLSubmissionStepProps {
  onSubmit: (url: string, leadId: string) => void
}

export function URLSubmissionStep({ onSubmit }: URLSubmissionStepProps) {
  const [url, setUrl] = useState("")
  const [isValid, setIsValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState({
    title: "Transform Your Space",
    subtitle: "Share your Pinterest inspiration and get personalized interior design recommendations",
  })

  useEffect(() => {
    const fetchContent = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("content").select("value").in("key", ["hero_title", "hero_subtitle"])

      if (data) {
        setContent({
          title: data[0]?.value.text || content.title,
          subtitle: data[1]?.value.text || content.subtitle,
        })
      }
    }

    fetchContent()
  }, [])

  const validateUrl = (value: string) => {
    if (!value) return false
    try {
      const urlObj = new URL(value.startsWith("http") ? value : `https://${value}`)
      return urlObj.hostname.includes(".")
    } catch {
      return false
    }
  }

  const handleChange = (value: string) => {
    setUrl(value)
    setIsValid(validateUrl(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || isLoading) return

    setIsLoading(true)
    const formattedUrl = url.startsWith("http") ? url : `https://${url}`

    const supabase = createClient()
    const { data, error } = await supabase
      .from("leads")
      .insert({
        url: formattedUrl,
        email: "",
        status: "pending",
      })
      .select()
      .single()

    if (!error && data) {
      onSubmit(formattedUrl, data.id)
    } else {
      console.error("[v0] Error creating lead:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">{content.title}</h1>
        <p className="text-lg text-muted-foreground text-balance max-w-xl">{content.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="pinterest.com/pin/..."
            value={url}
            onChange={(e) => handleChange(e.target.value)}
            className="h-14 text-lg px-6 bg-card border-border"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={!isValid || isLoading} className="w-full h-14 text-lg font-semibold">
          {isLoading ? "Processing..." : "Get Recommendations"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">No credit card required • Takes less than 30 seconds</p>

      <div className="pt-8 border-t border-border/50 w-full max-w-md">
        <Link href="/auth/login">
          <Button variant="outline" className="w-full h-12 text-base bg-transparent">
            Login as Admin
          </Button>
        </Link>
      </div>
    </div>
  )
}
