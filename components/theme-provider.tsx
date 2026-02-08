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

  const hasUserOverride = () => {
    if (typeof window === 'undefined') return false
    return window.__srThemeUserOverride === true
  }

  // Сбрасываем синхронизацию при смене пользователя
  React.useEffect(() => {
    const nextUserId = user?.id ?? null
    if (nextUserId === lastUserIdRef.current) return

    // Сбрасываем “синхронизировано”, чтобы тема могла подтянуться для нового пользователя
    hasSyncedRef.current = false

    // Важно: НЕ сбрасываем флаг ручного выбора при первом появлении userId (null → id),
    // иначе первый клик по теме до загрузки пользователя будет перетёрт темой из БД.
    const hadUserBefore = lastUserIdRef.current !== null
    lastUserIdRef.current = nextUserId

    // Сбрасываем override только при реальной смене пользователя (когда раньше userId уже был)
    if (hadUserBefore && typeof window !== 'undefined') window.__srThemeUserOverride = false
  }, [user?.id])

  // Синхронизируем тему из БД только один раз при первой загрузке
  React.useEffect(() => {
    // Пропускаем если:
    // - ещё загружается
    // - пользователь не авторизован
    if (isLoading || !user) {
      return
    }

    // КРИТИЧНО: проверяем hasUserOverride() ДО проверки hasSyncedRef!
    // Иначе после первого клика эффект выйдет на hasSyncedRef раньше,
    // чем проверит флаг ручного выбора, и тема откатится.
    if (hasUserOverride()) {
      hasSyncedRef.current = true
      return
    }

    // Если уже синхронизировано И не было ручного выбора, больше не синхронизируем
    if (hasSyncedRef.current) {
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

declare global {
  interface Window {
    __srThemeUserOverride?: boolean
  }
}
