"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getUserTheme, updateUserTheme } from "@/app/actions/users"
import { useCurrentUser } from "./use-auth"

export type Theme = "light" | "dark" | "system"

interface UseUserThemeReturn {
  userTheme: Theme | null
  isLoading: boolean
  saveTheme: (theme: Theme) => Promise<void>
  isSaving: boolean
}

/**
 * Загрузка темы пользователя из БД
 */
async function fetchUserTheme(userId: string): Promise<Theme | null> {
  const result = await getUserTheme(userId)
  if ("error" in result || !result.theme) {
    return null
  }
  return result.theme as Theme
}

/**
 * Хук для работы с темой пользователя из базы данных
 * Для авторизованных пользователей тема хранится в БД
 * Для неавторизованных - в localStorage через next-themes
 */
export function useUserTheme(): UseUserThemeReturn {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()

  // Загружаем тему из БД для авторизованных пользователей
  const {
    data: userTheme,
    isLoading,
  } = useQuery({
    queryKey: ["userTheme", user?.id],
    queryFn: () => fetchUserTheme(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    retry: 1, // Минимум повторных попыток для быстрого отклика
  })

  // Мутация для сохранения темы
  const { mutateAsync: saveThemeMutation, isPending: isSaving } = useMutation({
    mutationFn: async (theme: Theme) => {
      if (!user) {
        // Для неавторизованных пользователей просто возвращаемся
        // next-themes сам сохранит в localStorage
        return
      }

      const result = await updateUserTheme(user.id, theme)
      if ("error" in result) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: async (_, theme) => {
      // Оптимистично обновляем кэш сразу
      queryClient.setQueryData(["userTheme", user?.id], theme)
      // Не инвалидируем запрос, чтобы избежать лишних запросов
    },
  })

  const saveTheme = async (theme: Theme) => {
    // Для неавторизованных пользователей ничего не делаем
    // next-themes сам сохранит в localStorage
    if (!user) {
      return
    }
    
    // Сохраняем асинхронно, не блокируя UI
    await saveThemeMutation(theme)
  }

  return {
    userTheme: userTheme ?? null,
    isLoading: isLoading && !!user,
    saveTheme,
    isSaving,
  }
}
