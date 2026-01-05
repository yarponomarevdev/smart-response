"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

// ID админов с расширенными правами (хардкод для обратной совместимости)
const ADMIN_UIDS = [
  "6cb16c09-6a85-4079-9579-118168e95b06",
]

interface UserWithRole {
  id: string
  email: string
  role: "user" | "admin" | "superadmin"
  language?: "ru" | "en"
}

/**
 * Загрузка текущего пользователя с ролью
 */
async function fetchCurrentUser(): Promise<UserWithRole | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from("users")
    .select("role, language")
    .eq("id", user.id)
    .single()

  // Проверяем роль в БД или хардкод для админов
  let role: "user" | "admin" | "superadmin" = data?.role || "user"
  if (ADMIN_UIDS.includes(user.id) && role === "user") {
    role = "admin"
  }

  return {
    id: user.id,
    email: user.email || "",
    role,
    language: data?.language as "ru" | "en" | undefined,
  }
}

/**
 * Хук для получения текущего пользователя с его ролью
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: fetchCurrentUser,
    staleTime: 10 * 60 * 1000, // 10 минут - данные пользователя редко меняются
  })
}

