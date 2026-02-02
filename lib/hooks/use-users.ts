"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getAllUsers, updateUserQuotas, updateUserEmail, updateUserPassword, deleteUserAccount } from "@/app/actions/users"

interface UserWithStats {
  id: string
  email: string
  role: string
  created_at: string
  form_count: number
  lead_count: number
  max_forms: number | null
  max_leads: number | null
  can_publish_forms: boolean
}

/**
 * Загрузка всех пользователей (для superadmin)
 */
async function fetchUsers(): Promise<UserWithStats[]> {
  const result = await getAllUsers()
  if ("error" in result) throw new Error(result.error)
  return result.users
}

/**
 * Хук для получения всех пользователей (только для superadmin)
 */
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 минут
  })
}

/**
 * Хук для обновления квот пользователя
 */
export function useUpdateUserQuotas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      field,
      value,
    }: {
      userId: string
      field: "max_forms" | "max_leads" | "can_publish_forms"
      value: number | null | boolean
    }) => {
      const result = await updateUserQuotas({
        userId,
        [field]: value,
      })
      if ("error" in result) throw new Error(result.error)
      return result
    },
    // Оптимистичное обновление
    onMutate: async ({ userId, field, value }) => {
      // Отменяем текущие запросы
      await queryClient.cancelQueries({ queryKey: ["users"] })

      // Сохраняем предыдущее значение
      const previousUsers = queryClient.getQueryData<UserWithStats[]>(["users"])

      // Оптимистично обновляем
      if (previousUsers) {
        queryClient.setQueryData<UserWithStats[]>(
          ["users"],
          previousUsers.map(user =>
            user.id === userId ? { ...user, [field]: value } : user
          )
        )
      }

      return { previousUsers }
    },
    // Откат при ошибке
    onError: (err, variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(["users"], context.previousUsers)
      }
    },
    // После успеха принудительно перезагружаем данные
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ["users"] })
    },
  })
}

/**
 * Хук для обновления email пользователя
 */
export function useUpdateEmail() {
  return useMutation({
    mutationFn: async (newEmail: string) => {
      const result = await updateUserEmail(newEmail)
      if (!result.success) throw new Error(result.error)
      return result
    },
  })
}

/**
 * Хук для обновления пароля пользователя
 */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const result = await updateUserPassword(newPassword)
      if (!result.success) throw new Error(result.error)
      return result
    },
  })
}

/**
 * Хук для удаления аккаунта пользователя
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const result = await deleteUserAccount()
      if (!result.success) throw new Error(result.error)
      return result
    },
  })
}
