/**
 * ContactsTab - Вкладка "Контакты"
 * Расширенные настройки формы контактов: заголовки, поля, чекбоксы, кнопки
 * С автосохранением каждого поля
 */
"use client"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { AutoSaveFieldWrapper, SaveStatusIndicator } from "@/components/ui/auto-save-input"
import { useAutoSaveField, useAutoSaveBoolean } from "@/lib/hooks/use-autosave"
import { useTranslation } from "@/lib/i18n"

interface ContactsTabProps {
  formId: string | null
  content: Record<string, string>
}

export function ContactsTab({ formId, content }: ContactsTabProps) {
  const { t } = useTranslation()
  
  // Автосохраняемые текстовые поля
  const gradientText = useAutoSaveField({
    formId,
    fieldKey: "gradient_text",
    initialValue: content.gradient_text || "",
  })

  const emailPlaceholder = useAutoSaveField({
    formId,
    fieldKey: "email_placeholder",
    initialValue: content.email_placeholder || "",
  })

  const phonePlaceholder = useAutoSaveField({
    formId,
    fieldKey: "phone_placeholder",
    initialValue: content.phone_placeholder || "",
  })

  const feedbackText = useAutoSaveField({
    formId,
    fieldKey: "feedback_text",
    initialValue: content.feedback_text || "",
  })

  const emailButton = useAutoSaveField({
    formId,
    fieldKey: "email_button",
    initialValue: content.email_button || "",
  })

  const privacyUrl = useAutoSaveField({
    formId,
    fieldKey: "privacy_url",
    initialValue: content.privacy_url || "",
  })

  // Автосохраняемые boolean поля
  const phoneEnabled = useAutoSaveBoolean({
    formId,
    fieldKey: "phone_enabled",
    initialValue: content.phone_enabled === "true",
  })

  const phoneRequired = useAutoSaveBoolean({
    formId,
    fieldKey: "phone_required",
    initialValue: content.phone_required === "true",
  })

  const feedbackEnabled = useAutoSaveBoolean({
    formId,
    fieldKey: "feedback_enabled",
    initialValue: content.feedback_enabled === "true",
  })

  return (
    <div className="space-y-6 sm:space-y-8 max-w-2xl">
      {/* Текст в градиенте */}
      <AutoSaveFieldWrapper
        label={t("editor.contactsTab.motivationText")}
        labelFor="gradient_text"
        status={gradientText.status}
      >
        <Input
          id="gradient_text"
          value={gradientText.value}
          onChange={(e) => gradientText.onChange(e.target.value)}
          placeholder={t("editor.contactsTab.motivationPlaceholder")}
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </AutoSaveFieldWrapper>

      {/* Email (обязательное поле) */}
      <AutoSaveFieldWrapper
        label={t("editor.contactsTab.emailRequired")}
        labelFor="email_placeholder"
        status={emailPlaceholder.status}
      >
        <Input
          id="email_placeholder"
          value={emailPlaceholder.value}
          onChange={(e) => emailPlaceholder.onChange(e.target.value)}
          placeholder={t("editor.contactsTab.emailPlaceholder")}
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </AutoSaveFieldWrapper>

      {/* Телефон */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="phone_placeholder" className="text-base sm:text-lg">{t("editor.contactsTab.phone")}</label>
          <div className="flex items-center gap-2">
            <SaveStatusIndicator status={phoneEnabled.status} />
            <span className="text-sm text-muted-foreground">
              {phoneEnabled.value ? t("editor.contactsTab.show") : t("editor.contactsTab.hide")}
            </span>
            <Switch
              id="phone_enabled"
              checked={phoneEnabled.value}
              onCheckedChange={phoneEnabled.onChange}
            />
          </div>
        </div>
        {phoneEnabled.value && (
          <>
            <div className="relative">
              <Input
                id="phone_placeholder"
                value={phonePlaceholder.value}
                onChange={(e) => phonePlaceholder.onChange(e.target.value)}
                placeholder={t("editor.contactsTab.phonePlaceholder")}
                className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <SaveStatusIndicator status={phonePlaceholder.status} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <label htmlFor="phone_required" className="text-sm sm:text-base">{t("editor.contactsTab.makeRequired")}</label>
              <div className="flex items-center gap-2">
                <SaveStatusIndicator status={phoneRequired.status} />
                <span className="text-sm text-muted-foreground">
                  {phoneRequired.value ? t("common.yes") : t("common.no")}
                </span>
                <Switch
                  id="phone_required"
                  checked={phoneRequired.value}
                  onCheckedChange={phoneRequired.onChange}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Обратная связь */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-base sm:text-lg">{t("editor.contactsTab.feedback")}</label>
          <div className="flex items-center gap-2">
            <SaveStatusIndicator status={feedbackEnabled.status} />
            <span className="text-sm text-muted-foreground">
              {feedbackEnabled.value ? t("editor.contactsTab.show") : t("editor.contactsTab.hide")}
            </span>
            <Switch
              id="feedback_enabled"
              checked={feedbackEnabled.value}
              onCheckedChange={feedbackEnabled.onChange}
            />
          </div>
        </div>
        {feedbackEnabled.value && (
          <div className="flex items-center gap-3 pt-2">
            <div className="border-2 border-black dark:border-white rounded-[5px] w-[41px] h-[41px] flex-shrink-0" />
            <div className="relative flex-1">
              <Input
                id="feedback_text"
                value={feedbackText.value}
                onChange={(e) => feedbackText.onChange(e.target.value)}
                placeholder={t("editor.contactsTab.feedbackPlaceholder")}
                className="h-10 border-none bg-transparent text-base sm:text-lg px-0"
              />
            </div>
            <SaveStatusIndicator status={feedbackText.status} />
          </div>
        )}
      </div>

      {/* Текст кнопки отправки */}
      <AutoSaveFieldWrapper
        label={t("editor.contactsTab.submitText")}
        labelFor="email_button"
        status={emailButton.status}
      >
        <Input
          id="email_button"
          value={emailButton.value}
          onChange={(e) => emailButton.onChange(e.target.value)}
          placeholder={t("editor.contactsTab.submitPlaceholder")}
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </AutoSaveFieldWrapper>

      {/* Политика конфиденциальности */}
      <AutoSaveFieldWrapper
        label={t("editor.contactsTab.privacyPolicy")}
        labelFor="privacy_url"
        status={privacyUrl.status}
        description={t("editor.contactsTab.privacyText")}
      >
        <Input
          id="privacy_url"
          value={privacyUrl.value}
          onChange={(e) => privacyUrl.onChange(e.target.value)}
          placeholder={t("editor.contactsTab.privacyPlaceholder")}
          className="h-12 sm:h-[70px] rounded-[18px] bg-[#f4f4f4] dark:bg-muted border-[#f4f4f4] dark:border-muted text-base sm:text-lg px-4 sm:px-6"
        />
      </AutoSaveFieldWrapper>
    </div>
  )
}
