/**
 * ContactsTab - Вкладка "Контакты"
 * Расширенные настройки формы контактов: заголовки, поля, чекбоксы, кнопки
 */
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

interface ContactsTabProps {
  content: Record<string, string>
  onChange: (content: Record<string, string>) => void
}

export function ContactsTab({ content, onChange }: ContactsTabProps) {
  const handleChange = (key: string, value: string) => {
    onChange({ ...content, [key]: value })
  }

  const handleBooleanChange = (key: string, value: boolean) => {
    onChange({ ...content, [key]: value ? "true" : "false" })
  }

  const isPhoneEnabled = content.phone_enabled === "true"
  const isFeedbackEnabled = content.feedback_enabled === "true"
  const isPrivacyEnabled = content.privacy_enabled === "true"

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl">
      {/* Заголовок */}
      <div className="space-y-2">
        <Label htmlFor="email_title" className="text-base sm:text-lg">Заголовок</Label>
        <Input
          id="email_title"
          value={content.email_title || ""}
          onChange={(e) => handleChange("email_title", e.target.value)}
          placeholder="Заголовок"
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </div>

      {/* Подзаголовок */}
      <div className="space-y-2">
        <Label htmlFor="email_subtitle" className="text-base sm:text-lg">Подзаголовок</Label>
        <Input
          id="email_subtitle"
          value={content.email_subtitle || ""}
          onChange={(e) => handleChange("email_subtitle", e.target.value)}
          placeholder="Подзаголовок"
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </div>

      {/* Текст над формой */}
      <div className="space-y-2">
        <Label htmlFor="email_form_description" className="text-base sm:text-lg">Текст над формой</Label>
        <Input
          id="email_form_description"
          value={content.email_form_description || ""}
          onChange={(e) => handleChange("email_form_description", e.target.value)}
          placeholder="hello.smartresponse.com"
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </div>

      {/* Email (обязательное поле) */}
      <div className="space-y-2">
        <Label htmlFor="email_placeholder" className="text-base sm:text-lg">Email (обязательное поле)</Label>
        <Input
          id="email_placeholder"
          value={content.email_placeholder || ""}
          onChange={(e) => handleChange("email_placeholder", e.target.value)}
          placeholder="hello.smartresponse.com"
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </div>

      {/* Телефон */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="phone_placeholder" className="text-base sm:text-lg">Телефон</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {isPhoneEnabled ? "Показывать" : "Не показывать"}
            </span>
            <Switch
              id="phone_enabled"
              checked={isPhoneEnabled}
              onCheckedChange={(checked) => handleBooleanChange("phone_enabled", checked)}
            />
          </div>
        </div>
        <Input
          id="phone_placeholder"
          value={content.phone_placeholder || ""}
          onChange={(e) => handleChange("phone_placeholder", e.target.value)}
          placeholder="+375 33 366 76 99"
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
          disabled={!isPhoneEnabled}
        />
      </div>

      {/* Обратная связь */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base sm:text-lg">Обратная связь</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {isFeedbackEnabled ? "Показывать" : "Не показывать"}
            </span>
            <Switch
              id="feedback_enabled"
              checked={isFeedbackEnabled}
              onCheckedChange={(checked) => handleBooleanChange("feedback_enabled", checked)}
            />
          </div>
        </div>
        {isFeedbackEnabled && (
          <div className="flex items-center gap-3 pt-2">
            <div className="border-2 border-black dark:border-white rounded-[5px] w-[41px] h-[41px] flex-shrink-0" />
            <Input
              id="feedback_text"
              value={content.feedback_text || ""}
              onChange={(e) => handleChange("feedback_text", e.target.value)}
              placeholder="Да, свяжитесь со мной"
              className="h-10 border-none bg-transparent text-base sm:text-lg px-0"
            />
          </div>
        )}
      </div>

      {/* Текст кнопки отправки */}
      <div className="space-y-2">
        <Label htmlFor="email_button" className="text-base sm:text-lg">Текст кнопки отправки</Label>
        <Input
          id="email_button"
          value={content.email_button || ""}
          onChange={(e) => handleChange("email_button", e.target.value)}
          placeholder="Сгенерировать"
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </div>

      {/* Политика конфиденциальности */}
      <div className="space-y-2">
        <Label htmlFor="privacy_url" className="text-base sm:text-lg">Политика конфиденциальности</Label>
        <p className="text-xs sm:text-sm text-muted-foreground italic">
          "Отправляя данную форму вы соглашаетесь с <span className="underline">политикой конфиденциальности</span>"
        </p>
        <Input
          id="privacy_url"
          value={content.privacy_url || ""}
          onChange={(e) => handleChange("privacy_url", e.target.value)}
          placeholder="www.example.com/privacy"
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </div>
    </div>
  )
}
