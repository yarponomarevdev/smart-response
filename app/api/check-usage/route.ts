import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role to bypass RLS for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Безлимитное использование для всех пользователей
const MAX_USAGE_COUNT = null // null = безлимит
const TEST_EMAIL = "hello@vasilkov.digital"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const formId = searchParams.get("formId")
    const email = searchParams.get("email")

    if (!formId || !email) {
      return NextResponse.json(
        { error: "formId и email обязательны" },
        { status: 400 }
      )
    }

    // Считаем количество leads для данной пары form_id + email (для статистики)
    const { count, error } = await supabaseAdmin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("form_id", formId)
      .eq("email", email)

    if (error) {
      console.error("[check-usage] Ошибка подсчета лидов:", error)
      return NextResponse.json(
        { error: "Ошибка при проверке использований" },
        { status: 500 }
      )
    }

    const usageCount = count || 0

    // Безлимит для всех пользователей
    return NextResponse.json({
      usageCount,
      remainingCount: null, // null = безлимит
      maxCount: null, // null = безлимит
      hasReachedLimit: false, // всегда false
    })
  } catch (error) {
    console.error("[check-usage] Неожиданная ошибка:", error)
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    )
  }
}
