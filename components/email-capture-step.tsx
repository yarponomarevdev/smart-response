"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createLead } from "@/app/actions/leads"

interface EmailCaptureStepProps {
  url: string
  formId: string
  result: { type: string; text: string; imageUrl: string }
  onSuccess: () => void
}

export function EmailCaptureStep({ url, formId, result, onSuccess }: EmailCaptureStepProps) {
  const [email, setEmail] = useState("")
  const [isValid, setIsValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    // Отправляем email асинхронно, не блокируя UI
    const apiUrl = typeof window !== "undefined" ? `${window.location.origin}/api/send-email` : "/api/send-email"
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        resultText: result.text,
        resultImageUrl: result.imageUrl || null,
        resultType: result.type,
        url,
      }),
    }).catch((error) => {
      console.error("Ошибка отправки email:", error)
    })

    onSuccess()
  }

  return (
    <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">Получите результаты</h2>
        <p className="text-lg text-muted-foreground max-w-md">Введите email чтобы получить полный анализ</p>
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={!isValid || isLoading} className="w-full h-14 text-lg font-semibold">
          {isLoading ? "Отправка..." : "Отправить анализ"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">Мы уважаем вашу приватность. Никакого спама.</p>
    </div>
  )
}
