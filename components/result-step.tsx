"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createLead } from "@/app/actions/leads"
import { MarkdownRenderer } from "@/components/markdown-renderer"

interface ResultStepProps {
  url: string
  formId: string
  result: { type: string; text: string; imageUrl?: string }
  onSuccess: () => void
}

export function ResultStep({ url, formId, result, onSuccess }: ResultStepProps) {
  const [email, setEmail] = useState("")
  const [isValid, setIsValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const handleChange = (value: string) => {
    setEmail(value)
    setIsValid(validateEmail(value))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || isLoading) return

    setIsLoading(true)
    setError(null)

    const response = await createLead({
      formId,
      email,
      url,
      resultText: result.text,
      resultImageUrl: result.imageUrl || null,
    })

    if (response.error) {
      setError(response.error)
      setIsLoading(false)
      return
    }

    // Send email
    try {
      const apiUrl = typeof window !== "undefined" ? `${window.location.origin}/api/send-email` : "/api/send-email"
      await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          resultText: result.text,
          resultImageUrl: result.imageUrl || null,
          resultType: result.type,
          url,
        }),
      })
    } catch (err) {
      console.error("[v0] Error sending email:", err)
    }

    setIsUnlocked(true)
    onSuccess()
  }

  const generatePreview = (text: string, maxLength = 200) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-in fade-in duration-500 w-full px-4">
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold">Ваш результат готов!</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Введите email для просмотра</p>
      </div>

      <div className="w-full max-w-2xl">
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6 relative overflow-hidden">
          {result.type === "image" && result.imageUrl ? (
            <div className="relative">
              <img
                src={result.imageUrl || "/placeholder.svg"}
                alt="Generated result"
                className={`w-full rounded transition-all duration-500 ${!isUnlocked ? "blur-xl" : ""}`}
              />
              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white font-semibold text-sm sm:text-lg bg-black/60 px-3 sm:px-4 py-2 rounded text-center">
                    Введите email для просмотра
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-none text-left">
              {isUnlocked ? (
                <MarkdownRenderer content={result.text} className="text-xs sm:text-sm" />
              ) : (
                <div className="space-y-4 relative">
                  <div className="text-xs sm:text-sm leading-relaxed text-muted-foreground blur-sm select-none">
                    <MarkdownRenderer content={generatePreview(result.text, 300)} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card" />
                </div>
              )}
            </div>
          )}
        </div>

        {!isUnlocked && (
          <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-4">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => handleChange(e.target.value)}
              className="h-12 sm:h-14 text-base sm:text-lg px-4 sm:px-6 bg-card border-border"
              disabled={isLoading}
            />
            {error && <p className="text-sm text-destructive text-left">{error}</p>}
            <Button type="submit" disabled={!isValid || isLoading} className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold">
              {isLoading ? "Отправка..." : "Показать результат"}
            </Button>
            <p className="text-xs text-muted-foreground">Мы уважаем вашу приватность. Никакого спама.</p>
          </form>
        )}
      </div>
    </div>
  )
}
