/**
 * ContactsStep - Этап сбора контактных данных
 * Показывает форму для ввода email, телефона и чекбокс обратной связи.
 */
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface ContactsStepProps {
  formId: string
  onSubmit: (data: { email: string; phone?: string; feedback?: boolean }) => void
}

interface FormContent {
  // Email форма
  email_placeholder?: string
  phone_enabled?: string
  phone_placeholder?: string
  phone_required?: string
  feedback_enabled?: string
  feedback_text?: string
  privacy_url?: string
  email_button?: string
}

export function ContactsStep({ formId, onSubmit }: ContactsStepProps) {
  // Состояние формы
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [feedback, setFeedback] = useState(false)
  const [isEmailValid, setIsEmailValid] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // Контент формы
  const [content, setContent] = useState<FormContent>({})

  // Загрузка контента формы
  useEffect(() => {
    const fetchData = async () => {
      if (!formId) return
      
      const supabase = createClient()
      
      // Загружаем настройки формы контактов и статические элементы напрямую из forms
      const { data } = await supabase
        .from("forms")
        .select("email_placeholder, phone_enabled, phone_required, feedback_enabled, feedback_text, privacy_url, email_button, phone_placeholder")
        .eq("id", formId)
        .single()

      if (data) {
        setContent({
          email_placeholder: data.email_placeholder || undefined,
          phone_enabled: data.phone_enabled ? "true" : "false",
          phone_placeholder: data.phone_placeholder || undefined,
          phone_required: data.phone_required ? "true" : "false",
          feedback_enabled: data.feedback_enabled ? "true" : "false",
          feedback_text: data.feedback_text || undefined,
          privacy_url: data.privacy_url || undefined,
          email_button: data.email_button || undefined,
        })
      }
    }

    fetchData()
  }, [formId])

  // Извлекаем настройки из content
  const emailPlaceholder = content.email_placeholder || "your@email.com"
  const phoneEnabled = content.phone_enabled === "true"
  const phonePlaceholder = content.phone_placeholder || "+375 33 366 76 99"
  const phoneRequired = content.phone_required === "true"
  const feedbackEnabled = content.feedback_enabled === "true"
  const feedbackText = content.feedback_text || "Да, свяжитесь со мной"
  const privacyUrl = content.privacy_url || ""
  const submitButtonText = content.email_button || "Сгенерировать"

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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmailValid) return
    
    // Проверяем обязательность телефона
    if (phoneEnabled && phoneRequired && !phone) {
      setSubmitError("Поле телефона обязательно для заполнения")
      return
    }

    onSubmit({
      email,
      phone: phoneEnabled ? phone : undefined,
      feedback: feedbackEnabled ? feedback : undefined,
    })
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-in fade-in duration-500 w-full px-4 max-w-2xl mx-auto">
      {/* Форма email */}
      <div className="w-full max-w-[534px]">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-2 text-left">
            <Label htmlFor="email" className="text-sm sm:text-base font-normal">
              *Ваш Email (обязательно):
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={emailPlaceholder}
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="h-12 sm:h-14 text-base sm:text-lg px-4 sm:px-5 bg-[#f4f4f4] dark:bg-[#262626] border-0 rounded-[16px] placeholder:text-[#c3c3c3] text-center"
            />
          </div>

          {phoneEnabled && (
            <div className="space-y-2 text-left">
              <Label htmlFor="phone" className="text-sm sm:text-base font-medium">
                Ваш номер телефона{phoneRequired ? " (обязательно):" : ":"}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder={phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 sm:h-14 text-base sm:text-lg px-4 sm:px-5 bg-[#f4f4f4] dark:bg-[#262626] border-0 rounded-[16px] placeholder:text-[#c3c3c3] text-center"
                required={phoneRequired}
              />
            </div>
          )}

          {feedbackEnabled && (
            <div className="flex items-center space-x-2 sm:space-x-3 text-left">
              <Checkbox
                id="feedback"
                checked={feedback}
                onCheckedChange={(checked) => setFeedback(checked === true)}
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
            disabled={!isEmailValid || (phoneEnabled && phoneRequired && !phone)} 
            className="w-full h-12 sm:h-14 text-base sm:text-lg font-normal bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black rounded-[16px]"
          >
            {submitButtonText}
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

