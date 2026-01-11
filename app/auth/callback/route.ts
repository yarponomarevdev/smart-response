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
        if (role === "user") {
          const { data: form } = await supabase
            .from("forms")
            .insert({
              owner_id: data.user.id,
              name: "My Form",
              lead_limit: 20,
              lead_count: 0,
              is_active: true,
            })
            .select()
            .single()

          // Create default content for the form
          if (form) {
            const defaultContent = [
              { form_id: form.id, key: "page_title", value: "Анализ сайта с помощью ИИ" },
              { form_id: form.id, key: "page_subtitle", value: "Получите детальный анализ вашего сайта" },
              { form_id: form.id, key: "submit_button", value: "Получить анализ" },
              {
                form_id: form.id,
                key: "ai_system_prompt",
                value: "You are an expert consultant. Analyze the website and provide recommendations.",
              },
              { form_id: form.id, key: "ai_result_format", value: "text" },
            ]
            await supabase.from("form_content").insert(defaultContent)
          }
        }
      }

      // Redirect to the origin (the deployed app URL)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`)
}
