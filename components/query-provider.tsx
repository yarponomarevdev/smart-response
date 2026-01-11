"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Данные считаются свежими 5 минут
            staleTime: 5 * 60 * 1000,
            // Кэш хранится 10 минут
            gcTime: 10 * 60 * 1000,
            // Не перезагружать при фокусе окна
            refetchOnWindowFocus: false,
            // Не перезагружать при переподключении к сети
            refetchOnReconnect: false,
            // Одна попытка при ошибке
            retry: 1,
          },
        },
      })
  )

  // Отслеживаем текущего пользователя для очистки кэша при смене
  const previousUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Подписываемся на изменения auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentUserId = session?.user?.id ?? null

        // Если пользователь изменился (вход, выход, смена аккаунта)
        if (previousUserIdRef.current !== currentUserId) {
          // Очищаем весь кэш React Query при смене пользователя
          queryClient.clear()
          previousUserIdRef.current = currentUserId
        }

        // При выходе из системы очищаем кэш
        if (event === "SIGNED_OUT") {
          queryClient.clear()
        }
      }
    )

    // Инициализируем текущего пользователя
    supabase.auth.getUser().then(({ data: { user } }) => {
      previousUserIdRef.current = user?.id ?? null
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

