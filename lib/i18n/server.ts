import { cookies } from "next/headers"

type Language = "ru" | "en"

/**
 * Серверный хелпер для получения языка пользователя
 * Читает из cookie который устанавливается в middleware
 */
export async function getServerLanguage(): Promise<Language> {
  const cookieStore = await cookies()
  const languageCookie = cookieStore.get("preferred-language")
  
  if (languageCookie?.value === "ru" || languageCookie?.value === "en") {
    return languageCookie.value
  }
  
  // Fallback на английский (хотя middleware должен установить cookie)
  return "en"
}
