import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role to bypass RLS for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_USAGE_COUNT = 5
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

    // Проверяем, является ли это тестовым email
    const isTestEmail = email.toLowerCase() === TEST_EMAIL.toLowerCase()

    if (isTestEmail) {
      // Для тестового email возвращаем нулевое использование
      return NextResponse.json({
        usageCount: 0,
        remainingCount: MAX_USAGE_COUNT,
        maxCount: MAX_USAGE_COUNT,
        hasReachedLimit: false,
      })
    }

    // Считаем количество leads для данной пары form_id + email
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
    const remainingCount = Math.max(0, MAX_USAGE_COUNT - usageCount)
    const hasReachedLimit = usageCount >= MAX_USAGE_COUNT

    return NextResponse.json({
      usageCount,
      remainingCount,
      maxCount: MAX_USAGE_COUNT,
      hasReachedLimit,
    })
  } catch (error) {
    console.error("[check-usage] Неожиданная ошибка:", error)
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    )
  }
}
