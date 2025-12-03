/**
 * Server Actions для работы с пользователями
 * - getAllUsers: получение всех пользователей (только для суперадминов)
 */
"use server"

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface UserWithStats {
  id: string
  email: string
  role: string
  created_at: string
  form_count: number
  lead_count: number
}

/**
 * Получает всех пользователей с их статистикой (только для суперадминов)
 */
export async function getAllUsers(): Promise<{ users: UserWithStats[] } | { error: string }> {
  // Получаем текущего пользователя через серверный клиент
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Не авторизован" }
  }

  // Проверяем, является ли пользователь суперадмином
  const { data: currentUser } = await supabaseAdmin.from("users").select("role").eq("id", user.id).single()

  if (currentUser?.role !== "superadmin") {
    return { error: "Доступ запрещён" }
  }

  // Получаем всех пользователей через admin клиент (обходит RLS)
  const { data: usersData, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })

  if (error || !usersData) {
    return { error: error?.message || "Ошибка получения пользователей" }
  }

  // Получаем статистику для каждого пользователя
  const usersWithStats = await Promise.all(
    usersData.map(async (user) => {
      const { data: forms } = await supabaseAdmin
        .from("forms")
        .select("id, lead_count")
        .eq("owner_id", user.id)

      const formCount = forms?.length || 0
      const leadCount = forms?.reduce((sum, f) => sum + (f.lead_count || 0), 0) || 0

      return {
        ...user,
        form_count: formCount,
        lead_count: leadCount,
      }
    }),
  )

  return { users: usersWithStats }
}






