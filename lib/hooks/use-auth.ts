"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

interface UserWithRole {
  id: string
  email: string
  role: "user" | "superadmin"
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

  return {
    id: user.id,
    email: user.email || "",
    role: (data?.role as "user" | "superadmin") || "user",
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

