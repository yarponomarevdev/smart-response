/**
 * GenerationStep - Этап генерации результата
 * 
 * Показывает анимацию загрузки и CTA-блок во время генерации.
 * Настраивается через вкладку "Генерация" в редакторе.
 */
"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import { createLead } from "@/app/actions/leads"
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'
import { useTranslation } from "@/lib/i18n"

function extractErrorMessageFromPayload(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback

  const maybeAny = payload as any
  const details = maybeAny?.details
  const error = maybeAny?.error

  if (typeof details === "string" && details.trim()) return details
  if (typeof error === "string" && error.trim()) return error
  if (error && typeof error === "object" && typeof error.message === "string" && error.message.trim()) return error.message

  return fallback
}

async function readJsonOrText(response: Response) {
  const rawText = await response.text().catch(() => "")
  if (!rawText) return { data: null as any, rawText: "" }

  try {
    return { data: JSON.parse(rawText), rawText }
  } catch {
    return { data: null as any, rawText }
  }
}

interface GenerationStepProps {
  url: string | null
  formId: string
  customFields?: Record<string, unknown>
  contactData: { email: string; phone?: string; feedback?: boolean }
  sendEmailToRespondent?: boolean
  onComplete: (result: { type: string; text: string; imageUrl?: string }) => void
  onError?: (error: string) => void
}

interface FormContent {
  // Заголовки генерации (из вкладки "Генерация")
  gen_title?: string
  gen_subtitle?: string
  // CTA блок
  cta_text?: string
  button_text?: string
  button_url?: string
}

export function GenerationStep({ 
  url, 
  formId, 
  customFields, 
  contactData,
  sendEmailToRespondent = true,
  onComplete, 
  onError 
}: GenerationStepProps) {
  const { t } = useTranslation()
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

  // Функция генерации результата и создания лида
  const generateAndCreateLead = useCallback(async (): Promise<void> => {
    try {
      // Защита от некорректного состояния флоу: без formId API всегда вернёт 400
      // URL опционален - форма может работать без него
      if (!formId) {
        const message = t("errors.generationMissingData")
        console.error("Отсутствует обязательное поле formId")
        setError(message)
        setIsGenerating(false)
        onError?.(message)
        return
      }

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
        const parsed = await readJsonOrText(response)
        const fallback = `HTTP ${response.status}: ${response.statusText}`
        const rawErrorMessage = extractErrorMessageFromPayload(parsed.data, fallback)
        const errorMessage =
          rawErrorMessage === "'formId' is required" ? t("errors.generationMissingData") : rawErrorMessage

        console.error("Генерация не удалась:", {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get("content-type"),
          errorData: parsed.data,
          errorText: parsed.data ? undefined : parsed.rawText?.slice(0, 2000),
        })

        throw new Error(errorMessage)
      }

      const parsedOk = await readJsonOrText(response)
      const data = parsedOk.data

      if (!data) {
        console.error("Сервер вернул не-JSON ответ:", parsedOk.rawText?.slice(0, 2000))
        throw new Error("Сервер вернул не-JSON ответ от /api/generate")
      }

      if (data.success && data.result) {
        const generatedResult = data.result
        
        // Создаём лид с данными контактов
        const extendedCustomFields = {
          ...customFields,
          ...(contactData.phone ? { phone: contactData.phone } : {}),
          ...(contactData.feedback !== undefined ? { requestFeedback: contactData.feedback } : {}),
        }

        const leadResponse = await createLead({
          formId,
          email: contactData.email,
          url,
          resultText: generatedResult.text,
          resultImageUrl: generatedResult.imageUrl || null,
          customFields: extendedCustomFields,
        })

        if (leadResponse.error) {
          console.error("Не удалось создать лид:", leadResponse.error)
          // Продолжаем даже если лид не создался
        }

        // Отправляем email асинхронно, если включена настройка
        if (sendEmailToRespondent) {
          const emailApiUrl = typeof window !== "undefined" 
            ? `${window.location.origin}/api/send-email` 
            : "/api/send-email"
          
          fetch(emailApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: contactData.email,
              resultText: generatedResult.text,
              resultImageUrl: generatedResult.imageUrl || null,
              resultType: generatedResult.type,
              url,
              formId,
            }),
          }).catch((err) => {
            console.error("Ошибка отправки email:", err)
          })
        }

        setIsGenerating(false)
        onCompleteRef.current(generatedResult)
      } else {
        console.error("Генерация не удалась:", data?.error || data?.details || data)
        throw new Error(
          extractErrorMessageFromPayload(
            data,
            "Не удалось сгенерировать результат (некорректный формат ответа сервера)",
          ),
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      console.error("Ошибка вызова API генерации:", errorMessage)
      setError(errorMessage)
      setIsGenerating(false)
      onError?.(errorMessage)
    } finally {
      setIsRetrying(false)
    }
  }, [url, formId, customFields, contactData, sendEmailToRespondent, onError, t])

  // Ротация сообщений
  useEffect(() => {
    if (error || !isGenerating) return
    
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2000)

    return () => clearInterval(messageInterval)
  }, [messages.length, error, isGenerating])

  // Запуск генерации при монтировании
  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    generateAndCreateLead()
  }, [generateAndCreateLead])

  // Обработчик повторной попытки
  const handleRetry = () => {
    setIsRetrying(true)
    setError(null)
    hasStartedRef.current = false
    generateAndCreateLead()
  }

  // Извлекаем настройки из content
  const genTitle = content.gen_title || "Генерируем ваш результат"
  const genSubtitle = content.gen_subtitle || "Подождите несколько секунд..."
  const ctaText = content.cta_text || ""
  const buttonText = content.button_text || ""
  const buttonUrl = content.button_url || ""

  // Отображение ошибки генерации
  if (error) {
    const isLimitError = error.includes("лимита использований")
    
    return (
      <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 animate-in fade-in duration-500 p-4 sm:p-6">
        <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-base sm:text-lg font-semibold text-destructive">
            {isLimitError ? "Достигнут лимит использований" : "Произошла ошибка"}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-4">{error}</p>
        </div>
        {isLimitError ? (
          <Button 
            onClick={() => window.location.href = '/auth/register'}
            className="gap-2 h-10 sm:h-11 text-sm sm:text-base"
          >
            Зарегистрироваться
          </Button>
        ) : (
          <Button 
            onClick={handleRetry} 
            disabled={isRetrying}
            variant="outline"
            className="gap-2 h-10 sm:h-11 text-sm sm:text-base"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Повторяем...' : 'Попробовать снова'}
          </Button>
        )}
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

      {/* Блок с анимацией */}
      <div className="w-full max-w-[500px] sm:max-w-[600px]">
        <div className="rounded-[20px] sm:rounded-[24px] relative overflow-hidden flex items-center justify-center" style={{ aspectRatio: '16 / 10' }}>
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
              uSpeed={0.4}
              uStrength={3.5}
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
          
          {/* Overlay с текстом */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-[20px] sm:rounded-[24px]">
            <p className="text-white font-semibold text-sm sm:text-base px-4 text-center">
              {messages[messageIndex]}
            </p>
          </div>
        </div>
      </div>

      {/* CTA блок */}
      {ctaText && (
        <div className="w-full max-w-md space-y-3">
          <p className="text-sm sm:text-base font-medium">{ctaText}</p>
          {buttonText && buttonUrl && (
            <Button
              variant="default"
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black rounded-[16px]"
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

