"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { ensureUserExists } from "@/app/actions/users"

interface UserWithRole {
  id: string
  email: string
  role: "user" | "superadmin"
  language?: "ru" | "en"
}

/**
 * Загрузка текущего пользователя с ролью
 * Автоматически создаёт запись в users если её нет (защита от бесконечной загрузки)
 */
async function fetchCurrentUser(): Promise<UserWithRole | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("users")
    .select("role, language")
    .eq("id", user.id)
    .single()

  // Если записи нет в таблице users, создаём её через server action
  if (error?.code === "PGRST116" || !data) {
    // Server action обходит RLS и использует admin client
    await ensureUserExists(user.id, user.email!)

    // После создания записи, получаем данные снова
    const { data: newData } = await supabase
      .from("users")
      .select("role, language")
      .eq("id", user.id)
      .single()

    return {
      id: user.id,
      email: user.email || "",
      role: (newData?.role as "user" | "superadmin") || "user",
      language: (newData?.language as "ru" | "en") || "en",
    }
  }

  return {
    id: user.id,
    email: user.email || "",
    role: (data?.role as "user" | "superadmin") || "user",
    language: (data?.language as "ru" | "en") || "en",
  }
}

/**
 * Хук для получения текущего пользователя с его ролью
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: fetchCurrentUser,
    staleTime: 30 * 1000, // 30 секунд - для быстрого обновления при смене пользователя
    gcTime: 60 * 1000, // Кэш хранится 1 минуту
  })
}

