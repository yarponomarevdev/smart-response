'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { useUserTheme } from '@/lib/hooks/use-user-theme'
import { useTheme } from 'next-themes'
import { useCurrentUser } from '@/lib/hooks/use-auth'

/**
 * Внутренний компонент для синхронизации темы с БД
 * Загружает тему из БД только при первой загрузке или смене пользователя
 * Не вмешивается в локальные переключения темы пользователем
 */
function ThemeSynchronizer() {
  const { userTheme, isLoading } = useUserTheme()
  const { setTheme, theme } = useTheme()
  const { data: user } = useCurrentUser()
  const hasSyncedRef = React.useRef(false)
  const lastUserIdRef = React.useRef<string | null>(null)

  // Сбрасываем синхронизацию при смене пользователя
  React.useEffect(() => {
    if (user?.id !== lastUserIdRef.current) {
      hasSyncedRef.current = false
      lastUserIdRef.current = user?.id ?? null
    }
  }, [user?.id])

  // Синхронизируем тему из БД только один раз при первой загрузке
  React.useEffect(() => {
    // Пропускаем если:
    // - ещё загружается
    // - уже синхронизировано
    // - пользователь не авторизован
    if (isLoading || hasSyncedRef.current || !user) {
      return
    }

    // Если есть тема из БД и она отличается от текущей - применяем её
    if (userTheme && theme !== userTheme) {
      setTheme(userTheme)
    }
    
    // Помечаем как синхронизированное после первой загрузки
    hasSyncedRef.current = true
  }, [isLoading, userTheme, user]) // Убрали theme и setTheme из зависимостей, чтобы избежать циклов

  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSynchronizer />
      {children}
    </NextThemesProvider>
  )
}
