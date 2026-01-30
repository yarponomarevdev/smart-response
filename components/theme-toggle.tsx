"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useUserTheme, type Theme } from "@/lib/hooks/use-user-theme"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { saveTheme } = useUserTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = React.useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark"
    
    // Мгновенно меняем тему локально для быстрого отклика UI
    setTheme(newTheme)
    
    // Асинхронно сохраняем в БД в фоне (не блокируем UI)
    // Используем void чтобы не ждать завершения
    void saveTheme(newTheme as Theme).catch((error) => {
      // Логируем ошибку, но не показываем пользователю
      // Тема уже применена локально через next-themes
      console.error("[ThemeToggle] Не удалось сохранить тему в БД:", error)
    })
  }, [theme, setTheme, saveTheme])

  if (!mounted) {
    return (
      <Button 
        className="h-10 sm:h-[53px] w-10 sm:w-[53px] rounded-[18px] bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800 border border-border transition-colors" 
        disabled
        aria-label="Переключить тему"
      >
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Переключить тему</span>
      </Button>
    )
  }

  return (
    <Button
      className="h-10 sm:h-[53px] w-10 sm:w-[53px] rounded-[18px] bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800 border border-border transition-colors"
      onClick={handleThemeChange}
      aria-label="Переключить тему"
    >
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
      )}
      <span className="sr-only">Переключить тему</span>
    </Button>
  )
}
