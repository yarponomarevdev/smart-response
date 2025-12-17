"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { createLead } from "@/app/actions/leads"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { useFormContent } from "@/lib/hooks/use-form-content"

interface ResultStepProps {
  url: string
  formId: string
  result: { type: string; text: string; imageUrl?: string }
  customFields?: Record<string, unknown>
  onSuccess: () => void
}

export function ResultStep({ url, formId, result, customFields, onSuccess }: ResultStepProps) {
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [showPhone, setShowPhone] = useState(false)
  const [feedback, setFeedback] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)

  // Загружаем контент формы
  const { data: formData } = useFormContent(formId)
  const content = formData?.content || {}

  // Извлекаем настройки из content
  const emailTitle = content.email_title || "Ваш результат готов!"
  const emailSubtitle = content.email_subtitle || "Введите email для просмотра"
  const emailFormDescription = content.email_form_description || ""
  const emailPlaceholder = content.email_placeholder || "hello.smartresponse.com"
  const emailLabel = content.email_label || "Email (обязательное поле)"
  
  const phoneEnabled = content.phone_enabled === "true"
  const phonePlaceholder = content.phone_placeholder || "+375 33 366 76 99"
  const phoneLabel = content.phone_label || "Телефон"
  const phoneShowText = content.phone_show_text || "Показать"
  
  const feedbackEnabled = content.feedback_enabled === "true"
  const feedbackText = content.feedback_text || "Да, свяжитесь со мной"
  
  const privacyEnabled = content.privacy_enabled === "true"
  const privacyText = content.privacy_text || "Отправляя данную форму вы соглашаетесь с политикой конфиденциальности"
  const privacyUrl = content.privacy_url || ""
  
  const submitButtonText = content.email_button || "Продолжить"
  const backButtonEnabled = content.back_button_enabled === "true"
  const backButtonText = content.back_button_text || "Вернуться назад"

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

    // Расширяем customFields данными телефона и обратной связи
    const extendedCustomFields = {
      ...customFields,
      ...(phoneEnabled && phone ? { phone } : {}),
      ...(feedbackEnabled ? { requestFeedback: feedback } : {}),
    }

    const response = await createLead({
      formId,
      email,
      url,
      resultText: result.text,
      resultImageUrl: result.imageUrl || null,
      customFields: extendedCustomFields,
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
    }).catch((err) => {
      console.error("[v0] Error sending email:", err)
    })

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
        <h2 className="text-2xl sm:text-3xl font-bold">{emailTitle}</h2>
        <p className="text-sm sm:text-base text-muted-foreground">{emailSubtitle}</p>
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
            {emailFormDescription && (
              <p className="text-sm text-muted-foreground text-left">{emailFormDescription}</p>
            )}
            
            <div className="space-y-2 text-left">
              <Label htmlFor="email" className="text-sm">{emailLabel}</Label>
              <Input
                id="email"
                type="email"
                placeholder={emailPlaceholder}
                value={email}
                onChange={(e) => handleChange(e.target.value)}
                className="h-12 sm:h-14 text-base px-4 bg-card border-border"
                disabled={isLoading}
              />
            </div>

            {phoneEnabled && (
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone" className="text-sm">{phoneLabel}</Label>
                  {!showPhone && (
                    <button
                      type="button"
                      onClick={() => setShowPhone(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      {phoneShowText}
                    </button>
                  )}
                </div>
                {showPhone && (
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 sm:h-14 text-base px-4 bg-card border-border"
                    disabled={isLoading}
                  />
                )}
              </div>
            )}

            {feedbackEnabled && (
              <div className="flex items-center space-x-2 text-left">
                <Checkbox
                  id="feedback"
                  checked={feedback}
                  onCheckedChange={(checked) => setFeedback(checked === true)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="feedback"
                  className="text-sm font-normal cursor-pointer"
                >
                  {feedbackText}
                </Label>
              </div>
            )}

            {privacyEnabled && (
              <div className="text-left">
                <p className="text-xs text-muted-foreground">
                  {privacyUrl ? (
                    <>
                      {privacyText.split("политикой конфиденциальности")[0]}
                      <a
                        href={privacyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        политикой конфиденциальности
                      </a>
                      {privacyText.split("политикой конфиденциальности")[1] || ""}
                    </>
                  ) : (
                    privacyText
                  )}
                </p>
              </div>
            )}

            {error && <p className="text-sm text-destructive text-left">{error}</p>}
            
            <div className="space-y-2">
              <Button 
                type="submit" 
                disabled={!isValid || isLoading} 
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
              >
                {isLoading ? "Отправка..." : submitButtonText}
              </Button>
              
              {backButtonEnabled && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                  disabled={isLoading}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
                >
                  {backButtonText}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
