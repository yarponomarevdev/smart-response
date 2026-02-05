"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import { useCurrentUser } from "@/lib/hooks/use-auth"
import { useUpdateUserLanguage } from "@/lib/hooks/use-user-language"
import { cn } from "@/lib/utils"

export function LanguageToggle({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { language, setLanguage } = useTranslation()
  const { data: user } = useCurrentUser()
  const updateLanguageMutation = useUpdateUserLanguage()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleLanguageChange = async () => {
    const newLanguage = language === "ru" ? "en" : "ru"
    
    // Обновляем UI и сохраняем в cookie/localStorage
    setLanguage(newLanguage)
    
    // Если пользователь авторизован, также сохраняем в БД
    if (user) {
      try {
        await updateLanguageMutation.mutateAsync(newLanguage)
      } catch (error) {
        console.error("Не удалось обновить язык в базе данных:", error)
      }
    }
  }

  if (!mounted) {
    return (
      <Button 
        className={cn(
          "h-10 sm:h-[53px] w-10 sm:w-[53px] rounded-[18px] bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800 border border-border transition-colors",
          className
        )}
        disabled
        {...props}
      >
        <span className="text-sm font-semibold">RU</span>
        <span className="sr-only">Переключить язык</span>
      </Button>
    )
  }

  return (
    <Button
      className={cn(
        "h-10 sm:h-[53px] w-10 sm:w-[53px] rounded-[18px] bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800 border border-border transition-colors",
        className
      )}
      onClick={handleLanguageChange}
      {...props}
    >
      <span className="text-sm font-semibold">
        {language.toUpperCase()}
      </span>
      <span className="sr-only">Переключить язык</span>
    </Button>
  )
}
