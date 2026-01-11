"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import { useCurrentUser } from "@/lib/hooks/use-auth"
import { useUpdateUserLanguage } from "@/lib/hooks/use-user-language"

export function LanguageToggle() {
  const { language, setLanguage } = useTranslation()
  const { data: user } = useCurrentUser()
  const updateLanguageMutation = useUpdateUserLanguage()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleLanguageChange = async () => {
    const newLanguage = language === "ru" ? "en" : "ru"
    
    // Сразу обновляем UI
    setLanguage(newLanguage)
    
    // Сохраняем в localStorage для всех пользователей
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred-language", newLanguage)
    }
    
    // Если пользователь авторизован, сохраняем в БД
    if (user) {
      try {
        await updateLanguageMutation.mutateAsync(newLanguage)
      } catch (error) {
        console.error("Failed to update language in database:", error)
      }
    }
  }

  if (!mounted) {
    return (
      <Button 
        className="h-10 sm:h-[53px] w-10 sm:w-[53px] rounded-[18px] bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800 border border-border transition-colors" 
        disabled
      >
        <span className="text-sm font-semibold">RU</span>
        <span className="sr-only">Переключить язык</span>
      </Button>
    )
  }

  return (
    <Button
      className="h-10 sm:h-[53px] w-10 sm:w-[53px] rounded-[18px] bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800 border border-border transition-colors"
      onClick={handleLanguageChange}
    >
      <span className="text-sm font-semibold">
        {language.toUpperCase()}
      </span>
      <span className="sr-only">Переключить язык</span>
    </Button>
  )
}
