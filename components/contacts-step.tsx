/**
 * ContactsStep - Этап сбора контактных данных
 * 
 * Показывает форму для ввода email, телефона и чекбокс обратной связи.
 * Элементы оформления (H1, H2, H3, дисклеймер) берутся из динамических полей формы.
 * Настраивается через вкладку "Контакты" в редакторе.
 */
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'
import { getFormFields, type FormField } from "@/app/actions/form-fields"

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
  gradient_text?: string
}

// Типы элементов оформления
const LAYOUT_TYPES = ["h1", "h2", "h3", "disclaimer"]

export function ContactsStep({ formId, onSubmit }: ContactsStepProps) {
  // Состояние формы
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [feedback, setFeedback] = useState(false)
  const [isEmailValid, setIsEmailValid] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // Контент формы
  const [content, setContent] = useState<FormContent>({})
  
  // Элементы оформления из динамических полей
  const [layoutFields, setLayoutFields] = useState<FormField[]>([])
  
  // Статические элементы оформления
  const [staticLayout, setStaticLayout] = useState<{
    heading?: string | null
    subheading?: string | null
    bodyText?: string | null
    disclaimer?: string | null
  }>({})

  // Загрузка контента формы и динамических полей (теперь из таблицы forms)
  useEffect(() => {
    const fetchData = async () => {
      if (!formId) return
      
      const supabase = createClient()
      
      // Загружаем настройки формы контактов и статические элементы напрямую из forms
      const { data } = await supabase
        .from("forms")
        .select("email_placeholder, phone_enabled, phone_required, feedback_enabled, feedback_text, privacy_url, email_button, gradient_text, static_heading, static_subheading, static_body_text, static_disclaimer, phone_placeholder")
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
          gradient_text: data.gradient_text || undefined,
        })
        
        setStaticLayout({
          heading: data.static_heading,
          subheading: data.static_subheading,
          bodyText: data.static_body_text,
          disclaimer: data.static_disclaimer,
        })
      }
      
      // Загружаем динамические поля для элементов оформления
      const fieldsResult = await getFormFields(formId)
      if ("fields" in fieldsResult && fieldsResult.fields.length > 0) {
        // Фильтруем только элементы оформления (не кнопку submit)
        const layouts = fieldsResult.fields.filter(f => LAYOUT_TYPES.includes(f.field_type))
        setLayoutFields(layouts)
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
  const gradientText = content.gradient_text || "Происходит что-то магическое..."
  
  // Рендер элемента оформления
  const renderLayoutField = (field: FormField) => {
    switch (field.field_type) {
      case "h1":
        return (
          <h1 key={field.id} className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-balance">
            {field.field_label}
          </h1>
        )
      case "h2":
        return (
          <h2 key={field.id} className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-balance">
            {field.field_label}
          </h2>
        )
      case "h3":
        return (
          <p key={field.id} className="text-base sm:text-lg md:text-xl text-muted-foreground text-balance">
            {field.field_label}
          </p>
        )
      case "disclaimer":
        return (
          <p key={field.id} className="text-xs sm:text-sm text-muted-foreground">
            {field.field_label}
          </p>
        )
      default:
        return null
    }
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
      {/* Статические элементы оформления */}
      {(staticLayout.heading || staticLayout.subheading || staticLayout.bodyText) && (
        <div className="space-y-2 sm:space-y-3">
          {staticLayout.heading && (
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-balance">
              {staticLayout.heading}
            </h1>
          )}
          {staticLayout.subheading && (
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-balance">
              {staticLayout.subheading}
            </h2>
          )}
          {staticLayout.bodyText && (
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground text-balance">
              {staticLayout.bodyText}
            </p>
          )}
        </div>
      )}
      
      {/* Элементы оформления из динамических полей */}
      {layoutFields.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          {layoutFields.map(renderLayoutField)}
        </div>
      )}

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
              uSpeed={0.15}
              uStrength={2}
              uDensity={1.2}
              uFrequency={5.5}
              uAmplitude={0}
              color1='#505050'
              color2='#808080'
              color3='#1a1a1a'
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
              {gradientText}
            </p>
          </div>
        </div>
      </div>

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
          
          {/* Статический дисклеймер перед кнопкой */}
          {staticLayout.disclaimer && (
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              {staticLayout.disclaimer}
            </p>
          )}
          
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

