import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/**
 * Определяет предпочитаемый язык из Accept-Language header
 */
function getPreferredLanguage(acceptLanguage: string | null): "ru" | "en" {
  if (!acceptLanguage) return "en"
  
  // Парсим Accept-Language header (например: "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7")
  const languages = acceptLanguage.split(",").map(lang => {
    const [code] = lang.trim().split(";")
    return code.split("-")[0].toLowerCase()
  })
  
  // Ищем ru или en в порядке приоритета
  if (languages.includes("ru")) return "ru"
  if (languages.includes("en")) return "en"
  
  // По умолчанию английский
  return "en"
}

export async function proxy(request: NextRequest) {
  // Сначала обрабатываем Supabase сессию
  let response = await updateSession(request)
  
  // Проверяем есть ли cookie с языком
  const languageCookie = request.cookies.get("preferred-language")
  
  if (!languageCookie) {
    // Если cookie нет, определяем язык из браузера
    const acceptLanguage = request.headers.get("accept-language")
    const detectedLanguage = getPreferredLanguage(acceptLanguage)
    
    // Устанавливаем cookie с определенным языком
    response.cookies.set("preferred-language", detectedLanguage, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 год
      sameSite: "lax",
    })
  }
  
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}


