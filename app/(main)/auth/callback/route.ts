import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/admin"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Create user in public.users if not exists
      const { data: existingUser } = await supabase.from("users").select("id").eq("id", data.user.id).single()

      if (!existingUser) {
        // Determine role: superadmin for specific email, user for others
        const role = data.user.email === "hello@vasilkov.digital" ? "superadmin" : "user"

        await supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email!,
          role,
          language: "en", // Английский язык по умолчанию для новых пользователей
        })

        // For regular users, create their first form
        // Дефолтные значения контента устанавливаются через DEFAULT в БД
        if (role === "user") {
          await supabase
            .from("forms")
            .insert({
              owner_id: data.user.id,
              name: "My Form",
              lead_limit: 20,
              lead_count: 0,
              is_active: true,
              // Кастомизируем некоторые дефолты
              page_subtitle: "Получите детальный анализ вашего сайта",
              ai_system_prompt: "You are an expert consultant. Analyze the website and provide recommendations.",
            })
        }
      }

      // Redirect to the origin (the deployed app URL)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`)
}
