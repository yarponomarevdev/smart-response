/**
 * LoadingStep - Компонент отображения процесса генерации
 * 
 * Показывает спиннер и анимированные сообщения во время генерации результата.
 * При ошибке показывает сообщение об ошибке с возможностью повторить.
 */
"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface LoadingStepProps {
  url: string
  formId?: string
  onComplete: (result: { type: string; text: string; imageUrl?: string }) => void
  onError?: (error: string) => void
}

export function LoadingStep({ url, formId, onComplete, onError }: LoadingStepProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [messages, setMessages] = useState([
    "Analyzing your link...",
    "Processing information...",
    "Generating recommendations...",
    "Almost done...",
  ])
  
  // Флаг для предотвращения повторных запросов
  const hasStartedRef = useRef(false)
  // Стабильная ссылка на onComplete
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Загрузка кастомных сообщений - выполняется один раз
  useEffect(() => {
    const fetchMessages = async () => {
      const supabase = createClient()

      if (formId) {
        const { data } = await supabase
          .from("form_content")
          .select("key, value")
          .eq("form_id", formId)
          .in("key", ["loading_message_1", "loading_message_2", "loading_message_3"])

        if (data && data.length > 0) {
          const loadedMessages = data
            .sort((a, b) => a.key.localeCompare(b.key))
            .map((item) => item.value)
            .filter((msg) => msg && msg.length > 0)

          if (loadedMessages.length > 0) {
            setMessages(loadedMessages)
          }
        }
      }
    }

    fetchMessages()
  }, [formId])

  // Функция генерации результата
  const generateResult = useCallback(async () => {
    try {
      setError(null)
      
      // Используем абсолютный URL для работы в iframe на внешних сайтах
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
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("[v0] Generation failed:", errorData)
        throw new Error(errorData.details || errorData.error || "Failed to generate result")
      }

      const data = await response.json()

      if (data.success && data.result) {
        setTimeout(() => {
          onCompleteRef.current(data.result)
        }, 1000)
      } else {
        console.error("[v0] Generation failed:", data.error || data.details)
        throw new Error(data.details || data.error || "Failed to generate result")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      console.error("[v0] Error calling generate API:", errorMessage)
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsRetrying(false)
    }
  }, [url, formId, onError])

  // Ротация сообщений
  useEffect(() => {
    if (error) return // Не ротируем сообщения при ошибке
    
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 1500)

    return () => clearInterval(messageInterval)
  }, [messages.length, error])

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

  // Отображение ошибки
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
    <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-8 animate-in fade-in duration-500 px-4">
      <Spinner className="h-12 w-12 sm:h-16 sm:w-16" />
      <p className="text-lg sm:text-xl text-muted-foreground animate-pulse text-center">{messages[messageIndex]}</p>
    </div>
  )
}
