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
    <div className="space-y-6">
      {/* Секция: Основные тексты */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Основные тексты</h3>
        
        <div className="space-y-2">
          <Label htmlFor="email_title" className="text-sm">Заголовок</Label>
          <Input
            id="email_title"
            value={content.email_title || ""}
            onChange={(e) => handleChange("email_title", e.target.value)}
            placeholder="Получите результаты"
            className="h-10 sm:h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email_subtitle" className="text-sm">Подзаголовок</Label>
          <Textarea
            id="email_subtitle"
            value={content.email_subtitle || ""}
            onChange={(e) => handleChange("email_subtitle", e.target.value)}
            placeholder="Введите email чтобы получить полный анализ"
            className="text-sm min-h-[60px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email_form_description" className="text-sm">Текст над формой</Label>
          <Input
            id="email_form_description"
            value={content.email_form_description || ""}
            onChange={(e) => handleChange("email_form_description", e.target.value)}
            placeholder="hello.smartresponse.com"
            className="h-10 sm:h-11"
          />
        </div>
      </div>

      {/* Секция: Email поле */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-semibold text-foreground">Email поле</h3>
        
        <div className="space-y-2">
          <Label htmlFor="email_placeholder" className="text-sm">Плейсхолдер email</Label>
          <Input
            id="email_placeholder"
            value={content.email_placeholder || ""}
            onChange={(e) => handleChange("email_placeholder", e.target.value)}
            placeholder="hello.smartresponse.com"
            className="h-10 sm:h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email_label" className="text-sm">Email (обязательное поле) - метка</Label>
          <Input
            id="email_label"
            value={content.email_label || ""}
            onChange={(e) => handleChange("email_label", e.target.value)}
            placeholder="Email (обязательное поле)"
            className="h-10 sm:h-11"
          />
        </div>
      </div>

      {/* Секция: Телефон */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Телефон</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="phone_enabled" className="text-sm text-muted-foreground cursor-pointer">
              Показать поле
            </Label>
            <Switch
              id="phone_enabled"
              checked={isPhoneEnabled}
              onCheckedChange={(checked) => handleBooleanChange("phone_enabled", checked)}
            />
          </div>
        </div>

        {isPhoneEnabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone_placeholder" className="text-sm">Плейсхолдер телефона</Label>
              <Input
                id="phone_placeholder"
                value={content.phone_placeholder || ""}
                onChange={(e) => handleChange("phone_placeholder", e.target.value)}
                placeholder="+375 33 366 76 99"
                className="h-10 sm:h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_label" className="text-sm">Телефон - метка</Label>
              <Input
                id="phone_label"
                value={content.phone_label || ""}
                onChange={(e) => handleChange("phone_label", e.target.value)}
                placeholder="Телефон"
                className="h-10 sm:h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_show_text" className="text-sm">Текст "Показать"</Label>
              <Input
                id="phone_show_text"
                value={content.phone_show_text || ""}
                onChange={(e) => handleChange("phone_show_text", e.target.value)}
                placeholder="Показать"
                className="h-10 sm:h-11"
              />
            </div>
          </>
        )}
      </div>

      {/* Секция: Обратная связь */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Обратная связь</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="feedback_enabled" className="text-sm text-muted-foreground cursor-pointer">
              Показать чекбокс
            </Label>
            <Switch
              id="feedback_enabled"
              checked={isFeedbackEnabled}
              onCheckedChange={(checked) => handleBooleanChange("feedback_enabled", checked)}
            />
          </div>
        </div>

        {isFeedbackEnabled && (
          <div className="space-y-2">
            <Label htmlFor="feedback_text" className="text-sm">Текст чекбокса</Label>
            <Input
              id="feedback_text"
              value={content.feedback_text || ""}
              onChange={(e) => handleChange("feedback_text", e.target.value)}
              placeholder="Да, свяжитесь со мной"
              className="h-10 sm:h-11"
            />
          </div>
        )}
      </div>

      {/* Секция: Политика конфиденциальности */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Политика конфиденциальности</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="privacy_enabled" className="text-sm text-muted-foreground cursor-pointer">
              Показать ссылку
            </Label>
            <Switch
              id="privacy_enabled"
              checked={isPrivacyEnabled}
              onCheckedChange={(checked) => handleBooleanChange("privacy_enabled", checked)}
            />
          </div>
        </div>

        {isPrivacyEnabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="privacy_text" className="text-sm">Текст</Label>
              <Textarea
                id="privacy_text"
                value={content.privacy_text || ""}
                onChange={(e) => handleChange("privacy_text", e.target.value)}
                placeholder="Отправляя данную форму вы соглашаетесь с политикой конфиденциальности"
                className="text-sm min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="privacy_url" className="text-sm">URL политики</Label>
              <Input
                id="privacy_url"
                value={content.privacy_url || ""}
                onChange={(e) => handleChange("privacy_url", e.target.value)}
                placeholder="www.example.com/privacy"
                className="h-10 sm:h-11"
              />
            </div>
          </>
        )}
      </div>

    </div>
  )
}
