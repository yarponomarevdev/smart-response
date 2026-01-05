"use client"

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from "react"
import { ru, type Translations } from "./translations/ru"
import { en } from "./translations/en"
import { useCurrentUser } from "@/lib/hooks/use-auth"

type Language = "ru" | "en"

interface LanguageContextValue {
  language: Language
  translations: Translations
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const translations: Record<Language, Translations> = {
  ru,
  en,
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru")
  const { data: user } = useCurrentUser()

  // Синхронизируем язык с настройками пользователя
  useEffect(() => {
    if (user) {
      // Проверяем, есть ли у пользователя сохранённый язык
      const userLanguage = (user as any).language as Language | undefined
      if (userLanguage && (userLanguage === "ru" || userLanguage === "en")) {
        // Обновляем язык только если он отличается от текущего
        setLanguageState((currentLang) => {
          if (currentLang !== userLanguage) {
            return userLanguage
          }
          return currentLang
        })
      }
    }
  }, [user?.language]) // Зависимость только от языка пользователя, а не от всего объекта user

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
  }, [])

  // Мемоизируем объект translations для текущего языка
  const currentTranslations = useMemo(() => translations[language], [language])

  // Мемоизируем значение контекста для предотвращения лишних ре-рендеров
  const contextValue = useMemo<LanguageContextValue>(
    () => ({
      language,
      translations: currentTranslations,
      setLanguage,
    }),
    [language, currentTranslations, setLanguage]
  )

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

/**
 * Хук для доступа к переводам
 * 
 * Использование:
 * const { t } = useTranslation()
 * <h1>{t('admin.panel.superadminTitle')}</h1>
 */
export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useTranslation must be used within LanguageProvider")
  }

  // Кэш для результатов переводов (в рамках одного рендера компонента)
  // Используем ключ языка для автоматической очистки кэша при смене языка
  const cacheRef = useRef<{ language: Language; cache: Map<string, string> }>({
    language: context.language,
    cache: new Map(),
  })

  // Очищаем кэш при изменении языка через useEffect для правильной синхронизации
  useEffect(() => {
    if (cacheRef.current.language !== context.language) {
      cacheRef.current.language = context.language
      cacheRef.current.cache.clear()
    }
  }, [context.language])

  // Мемоизируем функцию t с помощью useCallback для стабильности ссылки
  // Важно: функция t должна пересоздаваться при изменении языка или переводов
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // Разбираем ключ на части
      const keys = key.split(".")
      let value: any = context.translations

      // Итерация по ключам для получения значения
      for (const k of keys) {
        value = value?.[k]
        if (value === undefined) {
          console.warn(`Translation key not found: ${key}`)
          return key
        }
      }

      // Преобразуем значение в строку
      let result = String(value)

      // Поддержка интерполяции параметров
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue))
        })
      }

      return result
    },
    [context.translations, context.language]
  )

  return {
    t,
    language: context.language,
    setLanguage: context.setLanguage,
  }
}
