import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const hostname = request.nextUrl.hostname
  const mainDomain = getMainDomain(hostname)
  const isSecure = request.nextUrl.protocol === "https:"

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
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
            
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
