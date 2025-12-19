/**
 * LoadingStep - Компонент отображения процесса генерации
 * 
 * Показывает анимацию загрузки, форму email и CTA-блок.
 * При отправке формы сохраняет лид и переходит к результату.
 */
"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, RefreshCw } from "lucide-react"
import { createLead } from "@/app/actions/leads"

interface LoadingStepProps {
  url: string
  formId?: string
  customFields?: Record<string, unknown>
  onComplete: (result: { type: string; text: string; imageUrl?: string }) => void
  onError?: (error: string) => void
}

interface FormContent {
  // Заголовки генерации
  gen_title?: string
  gen_subtitle?: string
  // Email форма
  email_form_description?: string
  email_placeholder?: string
  email_label?: string
  phone_enabled?: string
  phone_placeholder?: string
  phone_label?: string
  feedback_enabled?: string
  feedback_text?: string
  privacy_url?: string
  email_button?: string
  // CTA блок
  cta_text?: string
  button_text?: string
  button_url?: string
}

export function LoadingStep({ url, formId, customFields, onComplete, onError }: LoadingStepProps) {
  // Состояние генерации
  const [isGenerating, setIsGenerating] = useState(true)
  const [messageIndex, setMessageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [messages, setMessages] = useState([
    "Анализируем данные...",
    "Обрабатываем информацию...",
    "Генерируем результат...",
  ])
  const [result, setResult] = useState<{ type: string; text: string; imageUrl?: string } | null>(null)
  
  // Состояние формы email
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [feedback, setFeedback] = useState(false)
  const [isEmailValid, setIsEmailValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // Контент формы
  const [content, setContent] = useState<FormContent>({})
  
  // Флаг для предотвращения повторных запросов
  const hasStartedRef = useRef(false)
  // Стабильная ссылка на onComplete
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Загрузка контента формы и сообщений
  useEffect(() => {
    const fetchContent = async () => {
      if (!formId) return
      
      const supabase = createClient()
      const { data } = await supabase
        .from("form_content")
        .select("key, value")
        .eq("form_id", formId)

      if (data && data.length > 0) {
        const contentMap: FormContent = {}
        const loadedMessages: string[] = []
        
        data.forEach((item) => {
          if (item.key.startsWith("loading_message_")) {
            const index = parseInt(item.key.replace("loading_message_", ""), 10)
            if (!isNaN(index) && item.value) {
              loadedMessages[index - 1] = item.value
            }
          } else {
            (contentMap as Record<string, string>)[item.key] = item.value
          }
        })
        
        setContent(contentMap)
        
        // Фильтруем пустые сообщения
        const filteredMessages = loadedMessages.filter(msg => msg && msg.length > 0)
        if (filteredMessages.length > 0) {
          setMessages(filteredMessages)
        }
      }
    }

    fetchContent()
  }, [formId])

  // Функция генерации результата
  const generateResult = useCallback(async () => {
    try {
      setError(null)
      setIsGenerating(true)
      
      const apiUrl = typeof window !== "undefined" 
        ? `${window.location.origin}/api/generate` 
        : "/api/generate"
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formId,
          customFields,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("[v0] Generation failed:", errorData)
        throw new Error(errorData.details || errorData.error || "Failed to generate result")
      }

      const data = await response.json()

      if (data.success && data.result) {
        setResult(data.result)
        setIsGenerating(false)
      } else {
        console.error("[v0] Generation failed:", data.error || data.details)
        throw new Error(data.details || data.error || "Failed to generate result")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      console.error("[v0] Error calling generate API:", errorMessage)
      setError(errorMessage)
      setIsGenerating(false)
      onError?.(errorMessage)
    } finally {
      setIsRetrying(false)
    }
  }, [url, formId, customFields, onError])

  // Ротация сообщений
  useEffect(() => {
    if (error || !isGenerating) return
    
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2000)

    return () => clearInterval(messageInterval)
  }, [messages.length, error, isGenerating])

  // Запуск генерации - выполняется ОДИН раз
  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    
    generateResult()
  }, [generateResult])

  // Обработчик повторной попытки
  const handleRetry = () => {
    setIsRetrying(true)
    setError(null)
    generateResult()
  }

  // Валидация email
  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setIsEmailValid(validateEmail(value))
    setSubmitError(null)
  }

  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmailValid || isSubmitting || !result || !formId) return

    setIsSubmitting(true)
    setSubmitError(null)

    // Расширяем customFields данными телефона и обратной связи
    const phoneEnabled = content.phone_enabled === "true"
    const feedbackEnabled = content.feedback_enabled === "true"
    
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
      setSubmitError(response.error)
      setIsSubmitting(false)
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

    // Переходим к результату
    onCompleteRef.current(result)
  }

  // Извлекаем настройки из content
  const genTitle = content.gen_title || "Получите персональную рекламную кампанию на основе сайта вашего бизнеса"
  const genSubtitle = content.gen_subtitle || "Подождите несколько секунд..."
  const emailFormDescription = content.email_form_description || "Куда отправить результат?"
  const emailPlaceholder = content.email_placeholder || "hello@example.com"
  const emailLabel = content.email_label || "*Ваш Email (обязательно)"
  const phoneEnabled = content.phone_enabled === "true"
  const phonePlaceholder = content.phone_placeholder || "+7 977 624 76 99"
  const phoneLabel = content.phone_label || "Ваш номер телефона"
  const feedbackEnabled = content.feedback_enabled === "true"
  const feedbackText = content.feedback_text || "Свяжитесь со мной"
  const privacyUrl = content.privacy_url || ""
  const submitButtonText = content.email_button || "Сгенерировать"
  const ctaText = content.cta_text || ""
  const buttonText = content.button_text || ""
  const buttonUrl = content.button_url || ""

  // Отображение ошибки генерации
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 animate-in fade-in duration-500 p-4 sm:p-6">
        <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-base sm:text-lg font-semibold text-destructive">Произошла ошибка</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-4">{error}</p>
        </div>
        <Button 
          onClick={handleRetry} 
          disabled={isRetrying}
          variant="outline"
          className="gap-2 h-10 sm:h-11 text-sm sm:text-base"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Повторяем...' : 'Попробовать снова'}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-in fade-in duration-500 w-full px-4">
      {/* Заголовок */}
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold">{genTitle}</h2>
        <p className="text-sm sm:text-base text-muted-foreground">{genSubtitle}</p>
      </div>

      {/* Превью с анимацией */}
      <div className="w-full max-w-md">
        <div className="bg-muted rounded-lg p-4 sm:p-6 relative overflow-hidden aspect-video flex items-center justify-center">
          {isGenerating ? (
            <div className="text-center">
              <div className="animate-pulse text-muted-foreground font-medium">
                {messages[messageIndex]}
              </div>
            </div>
          ) : result?.type === "image" && result?.imageUrl ? (
            <img
              src={result.imageUrl}
              alt="Generated result"
              className="w-full rounded blur-xl"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10 rounded blur-sm" />
          )}
          
          {/* Overlay с текстом */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
            <p className="text-white font-semibold text-sm sm:text-base px-4 text-center">
              {isGenerating ? messages[messageIndex] : "Происходит что-то магическое..."}
            </p>
          </div>
        </div>
      </div>

      {/* Форма email */}
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {emailFormDescription && (
            <p className="text-sm text-muted-foreground text-left font-medium">{emailFormDescription}</p>
          )}
          
          <div className="space-y-2 text-left">
            <Label htmlFor="email" className="text-sm">{emailLabel}</Label>
            <Input
              id="email"
              type="email"
              placeholder={emailPlaceholder}
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="h-12 sm:h-14 text-base px-4 bg-card border-border"
              disabled={isSubmitting}
            />
          </div>

          {phoneEnabled && (
            <div className="space-y-2 text-left">
              <Label htmlFor="phone" className="text-sm">{phoneLabel}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 sm:h-14 text-base px-4 bg-card border-border"
                disabled={isSubmitting}
              />
            </div>
          )}

          {feedbackEnabled && (
            <div className="flex items-center space-x-2 text-left">
              <Checkbox
                id="feedback"
                checked={feedback}
                onCheckedChange={(checked) => setFeedback(checked === true)}
                disabled={isSubmitting}
              />
              <Label
                htmlFor="feedback"
                className="text-sm font-normal cursor-pointer"
              >
                {feedbackText}
              </Label>
            </div>
          )}

          {submitError && <p className="text-sm text-destructive text-left">{submitError}</p>}
          
          <Button 
            type="submit" 
            disabled={!isEmailValid || isSubmitting || isGenerating} 
            className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
          >
            {isSubmitting ? "Отправка..." : isGenerating ? "Генерация..." : submitButtonText}
          </Button>

          {/* Политика конфиденциальности */}
          <p className="text-xs text-muted-foreground text-center">
            Отправляя данную форму вы соглашаетесь{" "}
            {privacyUrl ? (
              <a
                href={privacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                с политикой конфиденциальности
              </a>
            ) : (
              "с политикой конфиденциальности"
            )}
          </p>
        </form>
      </div>

      {/* CTA блок */}
      {ctaText && (
        <div className="w-full max-w-md space-y-3 pt-4">
          <p className="text-sm sm:text-base font-medium">{ctaText}</p>
          {buttonText && buttonUrl && (
            <Button
              variant="default"
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
              onClick={() => window.open(buttonUrl, "_blank")}
            >
              {buttonText}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
