"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

const MAIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"

interface URLSubmissionStepProps {
  onSubmit: (url: string) => void
  formId?: string
}

export function URLSubmissionStep({ onSubmit, formId }: URLSubmissionStepProps) {
  const effectiveFormId = formId || MAIN_FORM_ID

  const [url, setUrl] = useState("")
  const [isValid, setIsValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(true)
  const [content, setContent] = useState({
    title: "Анализ сайта с помощью ИИ",
    subtitle: "Получите детальный анализ вашего сайта за 30 секунд",
    buttonText: "Получить анализ",
    placeholder: "https://example.com",
    disclaimer: "Бесплатно • Занимает 30 секунд",
  })

  useEffect(() => {
    const fetchContent = async () => {
      setContentLoading(true)
      const supabase = createClient()
      const { data } = await supabase.from("form_content").select("key, value").eq("form_id", effectiveFormId)

      if (data && data.length > 0) {
        const contentMap: Record<string, string> = {}
        data.forEach((item) => {
          contentMap[item.key] = item.value
        })

        setContent({
          title: contentMap.page_title || "Анализ сайта с помощью ИИ",
          subtitle: contentMap.page_subtitle || "Получите детальный анализ вашего сайта за 30 секунд",
          buttonText: contentMap.submit_button || "Получить анализ",
          placeholder: contentMap.url_placeholder || "https://example.com",
          disclaimer: contentMap.disclaimer || "Бесплатно • Занимает 30 секунд",
        })
      }
      setContentLoading(false)
    }

    fetchContent()
  }, [effectiveFormId])

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
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || isLoading) return

    setIsLoading(true)
    setError(null)
    const formattedUrl = url.startsWith("http") ? url : `https://${url}`

    const supabase = createClient()

    const { data: forms, error: formError } = await supabase
      .from("forms")
      .select("is_active")
      .eq("id", effectiveFormId)
      .limit(1)

    if (formError || !forms || forms.length === 0) {
      setError("Форма не найдена")
      setIsLoading(false)
      return
    }

    const form = forms[0]

    if (!form.is_active) {
      setError("Форма временно недоступна")
      setIsLoading(false)
      return
    }

    // Лимит проверяется на уровне аккаунта в createLead()
    onSubmit(formattedUrl)
  }

  if (contentLoading) {
    return (
      <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500">
        <div className="space-y-4">
          <div className="h-12 w-64 bg-muted animate-pulse rounded" />
          <div className="h-6 w-48 bg-muted animate-pulse rounded mx-auto" />
        </div>
        <div className="w-full max-w-md space-y-4">
          <div className="h-14 bg-muted animate-pulse rounded" />
          <div className="h-14 bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-in fade-in duration-500 px-4">
      <div className="space-y-3 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance">{content.title}</h1>
        <p className="text-base sm:text-lg text-muted-foreground text-balance max-w-xl">{content.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div className="relative">
          <Input
            type="text"
            placeholder={content.placeholder}
            value={url}
            onChange={(e) => handleChange(e.target.value)}
            className="h-12 sm:h-14 text-base sm:text-lg px-4 sm:px-6 bg-card border-border"
            disabled={isLoading}
          />
        </div>
        {error && <p className="text-sm text-destructive text-left">{error}</p>}
        <Button type="submit" disabled={!isValid || isLoading} className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold">
          {isLoading ? "Обработка..." : content.buttonText}
        </Button>
      </form>

      <p className="text-xs sm:text-sm text-muted-foreground">{content.disclaimer}</p>
    </div>
  )
}
