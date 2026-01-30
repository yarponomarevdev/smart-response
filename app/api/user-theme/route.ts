import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

type Theme = "light" | "dark" | "system"

interface GetThemeResponse {
  theme: Theme | null
}

interface PostThemeRequest {
  theme: Theme
}

interface PostThemeResponse {
  success: boolean
}

interface ErrorResponse {
  error: string
}

/**
 * GET /api/user-theme
 * Получение сохранённой темы пользователя
 */
export async function GET(): Promise<NextResponse<GetThemeResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<GetThemeResponse>({ theme: null }, { status: 200 })
    }

    const { data, error } = await supabase
      .from("users")
      .select("theme")
      .eq("id", user.id)
      .single()

    if (error) {
      // Если пользователь не найден - это нормально, возвращаем null
      if (error.code === "PGRST116") {
        return NextResponse.json<GetThemeResponse>({ theme: null }, { status: 200 })
      }
      
      console.error("[user-theme] Ошибка получения темы:", error)
      return NextResponse.json<GetThemeResponse>({ theme: null }, { status: 200 })
    }

    const theme = (data?.theme as Theme) || null
    return NextResponse.json<GetThemeResponse>({ theme })
  } catch (error) {
    console.error("[user-theme] Неожиданная ошибка в GET:", error)
    return NextResponse.json<GetThemeResponse>({ theme: null }, { status: 200 })
  }
}

/**
 * POST /api/user-theme
 * Сохранение темы пользователя
 */
export async function POST(request: Request): Promise<NextResponse<PostThemeResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ErrorResponse>(
        { error: "Не авторизован" },
        { status: 401 }
      )
    }

    let body: PostThemeRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: "Неверный формат запроса" },
        { status: 400 }
      )
    }

    const { theme } = body

    if (!theme || !["light", "dark", "system"].includes(theme)) {
      return NextResponse.json<ErrorResponse>(
        { error: "Неверная тема. Допустимые значения: light, dark, system" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("users")
      .update({ theme })
      .eq("id", user.id)

    if (error) {
      console.error("[user-theme] Ошибка сохранения темы:", error)
      return NextResponse.json<ErrorResponse>(
        { error: "Ошибка сохранения темы" },
        { status: 500 }
      )
    }

    return NextResponse.json<PostThemeResponse>({ success: true })
  } catch (error) {
    console.error("[user-theme] Неожиданная ошибка в POST:", error)
    return NextResponse.json<ErrorResponse>(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    )
  }
}
