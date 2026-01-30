import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { Geist, Geist_Mono } from "next/font/google"
import { QueryProvider } from "@/components/query-provider"
import { LanguageProvider } from "@/lib/i18n"
import "../../globals.css"

const geist = Geist({ subsets: ["latin"] })

/**
 * Layout для публичных форм
 * НЕ использует глобальный ThemeProvider
 * Тема берётся из настроек формы и применяется на серверной стороне
 */
export default async function FormLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ id: string }>
}>) {
  const { id } = await params
  const supabase = await createClient()

  // Получаем тему и язык формы
  const { data: form } = await supabase
    .from("forms")
    .select("theme, language")
    .eq("id", id)
    .single()

  const formTheme = (form?.theme as "light" | "dark") || "light"
  const formLanguage = (form?.language as "ru" | "en") || "ru"

  // Для отладки: логируем язык формы
  if (process.env.NODE_ENV === "development") {
    console.log("[FormLayout] Form language:", formLanguage, "Form ID:", id)
  }

  return (
    <html lang={formLanguage} className={formTheme}>
      <body className={`${geist.className} font-sans antialiased`}>
        <QueryProvider>
          <LanguageProvider defaultLanguage={formLanguage}>
            {children}
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
