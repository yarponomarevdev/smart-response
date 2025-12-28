/**
 * FormThemeProvider - Провайдер темы для публичной формы
 * Применяет тему, заданную в настройках формы
 */
"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

interface FormThemeProviderProps {
  theme: "light" | "dark"
  children: React.ReactNode
}

export function FormThemeProvider({ theme, children }: FormThemeProviderProps) {
  const { setTheme } = useTheme()

  useEffect(() => {
    setTheme(theme)
  }, [theme, setTheme])

  return children
}

