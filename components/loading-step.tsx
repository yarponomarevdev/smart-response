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
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'
import * as reactSpring from '@react-spring/three'

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
  email_placeholder?: string
  email_label?: string
  phone_enabled?: string
  phone_placeholder?: string
  phone_label?: string
  feedback_enabled?: string
  feedback_text?: string
  privacy_url?: string
  email_button?: string
}

export function LoadingStep({ url, formId, customFields, onComplete, onError }: LoadingStepProps) {
  // Состояние генерации
  const [isGenerating, setIsGenerating] = useState(false)
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
  const generateResult = useCallback(async (): Promise<{ type: string; text: string; imageUrl?: string } | null> => {
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
        return data.result
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
      return null
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

  // Генерация теперь запускается только после отправки формы с email
  // (автоматический запуск при монтировании убран)

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
    if (!isEmailValid || isSubmitting || !formId) return

    setIsSubmitting(true)
    setSubmitError(null)

    // СНАЧАЛА запускаем генерацию, если она ещё не была запущена
    let generatedResult = result
    if (!generatedResult && !hasStartedRef.current) {
      hasStartedRef.current = true
      generatedResult = await generateResult()
      
      // Проверяем, не произошла ли ошибка при генерации
      if (!generatedResult) {
        setSubmitError("Не удалось сгенерировать результат. Попробуйте ещё раз.")
        setIsSubmitting(false)
        return
      }
    }

    // Проверяем наличие результата после генерации
    if (!generatedResult) {
      setSubmitError("Не удалось сгенерировать результат. Попробуйте ещё раз.")
      setIsSubmitting(false)
      return
    }

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
      resultText: generatedResult.text,
      resultImageUrl: generatedResult.imageUrl || null,
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
        resultText: generatedResult.text,
        resultImageUrl: generatedResult.imageUrl || null,
        resultType: generatedResult.type,
        url,
      }),
    }).catch((err) => {
      console.error("[v0] Error sending email:", err)
    })

    // Переходим к результату
    onCompleteRef.current(generatedResult)
  }

  // Извлекаем настройки из content
  const genTitle = content.gen_title || "Получите персональную рекламную кампанию на основе сайта вашего бизнеса"
  const genSubtitle = content.gen_subtitle || "Подождите несколько секунд..."
  const emailPlaceholder = content.email_placeholder || "hello@vasilkov.digital"
  const emailLabel = content.email_label || "*Ваш Email (обязательно):"
  const phoneEnabled = content.phone_enabled === "true"
  const phonePlaceholder = content.phone_placeholder || "+7 977 624 76 99"
  const phoneLabel = content.phone_label || "Ваш номер телефона:"
  const feedbackEnabled = content.feedback_enabled === "true"
  const feedbackText = content.feedback_text || "Свяжитесь со мной"
  const privacyUrl = content.privacy_url || ""
  const submitButtonText = content.email_button || "Сгенерировать"

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
    <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-in fade-in duration-500 w-full px-4 max-w-2xl mx-auto">
      {/* Главный заголовок */}
      <div className="space-y-2 sm:space-y-3">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
          {genTitle}
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
          {genSubtitle}
        </p>
      </div>

      {/* Блок с анимацией - показываем всегда */}
      <div className="w-full max-w-[500px] sm:max-w-[600px]">
        <div className="rounded-[20px] sm:rounded-[24px] relative overflow-hidden flex items-center justify-center" style={{ aspectRatio: '16 / 10' }}>
          {result?.type === "image" && result?.imageUrl ? (
            <img
              src={result.imageUrl}
              alt="Generated result"
              className="w-full h-full object-cover rounded-[20px] sm:rounded-[24px] blur-xl"
            />
          ) : (
            <>
              {/* ShaderGradient анимация */}
              <ShaderGradientCanvas
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                <ShaderGradient
                  control='props'
                  animate='on'
                  type='waterPlane'
                  uTime={0}
                  uSpeed={isGenerating ? 0.4 : 0.2}
                  uStrength={isGenerating ? 3.5 : 2}
                  uDensity={1.2}
                  uFrequency={5.5}
                  uAmplitude={0}
                  color1='#606080'
                  color2='#8d7dca'
                  color3='#212121'
                  brightness={1.2}
                  grain='on'
                  grainBlending={0.3}
                  cAzimuthAngle={180}
                  cPolarAngle={90}
                  cDistance={3.6}
                  wireframe={false}
                  shader='defaults'
                />
              </ShaderGradientCanvas>
            </>
          )}
          
          {/* Overlay с текстом */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-[20px] sm:rounded-[24px]">
            <p className="text-white font-semibold text-sm sm:text-base px-4 text-center">
              {isGenerating ? messages[messageIndex] : "Происходит что-то магическое..."}
            </p>
          </div>
        </div>
      </div>

      {/* Заголовок формы */}
      <h2 className="text-xl sm:text-2xl font-normal mt-2">
        Куда отправить результат?
      </h2>

      {/* Форма email */}
      <div className="w-full max-w-[534px]">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-2 text-left">
            <Label htmlFor="email" className="text-sm sm:text-base font-normal">
              {emailLabel}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={emailPlaceholder}
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="h-12 sm:h-14 text-base sm:text-lg px-4 sm:px-5 bg-[#f4f4f4] dark:bg-[#262626] border-0 rounded-[16px] placeholder:text-[#c3c3c3] text-center"
              disabled={isSubmitting}
            />
          </div>

          {phoneEnabled && (
            <div className="space-y-2 text-left">
              <Label htmlFor="phone" className="text-sm sm:text-base font-medium">
                {phoneLabel}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder={phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 sm:h-14 text-base sm:text-lg px-4 sm:px-5 bg-[#f4f4f4] dark:bg-[#262626] border-0 rounded-[16px] placeholder:text-[#c3c3c3] text-center"
                disabled={isSubmitting}
              />
            </div>
          )}

          {feedbackEnabled && (
            <div className="flex items-center space-x-2 sm:space-x-3 text-left">
              <Checkbox
                id="feedback"
                checked={feedback}
                onCheckedChange={(checked) => setFeedback(checked === true)}
                disabled={isSubmitting}
                className="size-5 sm:size-6 rounded-[5px] border-2 border-black dark:border-white"
              />
              <Label
                htmlFor="feedback"
                className="text-sm sm:text-base font-normal cursor-pointer"
              >
                {feedbackText}
              </Label>
            </div>
          )}

          {submitError && <p className="text-sm text-destructive text-left">{submitError}</p>}
          
          <Button 
            type="submit" 
            disabled={!isEmailValid || isSubmitting} 
            className="w-full h-12 sm:h-14 text-base sm:text-lg font-normal bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black rounded-[16px]"
          >
            {isSubmitting 
              ? (isGenerating ? "Генерируем результат..." : "Отправка...") 
              : submitButtonText}
          </Button>

          {/* Политика конфиденциальности */}
          <p className="text-xs sm:text-sm text-center leading-relaxed">
            Отправляя данную форму вы соглашаетесь{" "}
            {privacyUrl ? (
              <a
                href={privacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                с политикой конфиденциальности
              </a>
            ) : (
              <span className="underline">с политикой конфиденциальности</span>
            )}
          </p>
        </form>
      </div>

    </div>
  )
}
