import { createServerClient } from "@supabase/ssr"
import { cookies, headers } from "next/headers"

// Получаем главный домен из hostname (убираем поддомены)
function getMainDomain(hostname: string): string {
  // Если это localhost или IP, возвращаем как есть
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return hostname
  }
  
  // Разбиваем на части
  const parts = hostname.split(".")
  
  // Если меньше 2 частей, возвращаем как есть
  if (parts.length < 2) {
    return hostname
  }
  
  // Берем последние 2 части (например, example.com)
  // Для работы на всех поддоменах используем формат .example.com
  const mainDomain = parts.slice(-2).join(".")
  return `.${mainDomain}`
}

export async function createClient() {
  const cookieStore = await cookies()
  const headersList = await headers()
  
  // Получаем hostname из заголовков
  const hostname = headersList.get("host") || headersList.get("x-forwarded-host") || "localhost"
  const protocol = headersList.get("x-forwarded-proto") || "http"
  const mainDomain = getMainDomain(hostname)
  const isSecure = protocol === "https"

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Настраиваем cookies для работы между доменами
            const cookieOptions: {
              domain?: string
              sameSite: "lax" | "strict" | "none"
              secure: boolean
              path: string
              [key: string]: unknown
            } = {
              ...options,
              sameSite: "lax",
              secure: isSecure,
              path: "/",
            }
            
            // Для localhost и IP не устанавливаем domain
            if (hostname !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
              cookieOptions.domain = mainDomain
            }
            
            cookieStore.set(name, value, cookieOptions)
          })
        } catch {
          // Ignored if middleware is handling session refresh
        }
      },
    },
  })
}
