"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateUserLanguage } from "@/app/actions/users"
import { useCurrentUser } from "./use-auth"

/**
 * Хук для обновления языка пользователя
 */
export function useUpdateUserLanguage() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  return useMutation({
    mutationFn: async (language: "ru" | "en") => {
      if (!user) throw new Error("Пользователь не авторизован")

      const result = await updateUserLanguage(user.id, language)
      if ("error" in result) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: async (_, language) => {
      // Инвалидируем кэш пользователя и форсируем обновление
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      // Форсируем рефетч данных пользователя для немедленного обновления
      await queryClient.refetchQueries({ queryKey: ["currentUser"] })
    },
  })
}
