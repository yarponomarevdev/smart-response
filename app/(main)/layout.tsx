import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { LanguageProvider } from "@/lib/i18n"
import { Toaster } from "@/components/ui/toaster"
import { UpdateNotification } from "@/components/update-notification"
import "../globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SmartResponse.io — AI-Powered Adaptive Forms",
  description: "Build forms that think. Create AI-powered forms that adapt to user answers and generate personalized content. Turn leads into conversations.",
  generator: "Next.js",
  keywords: ["AI forms", "adaptive forms", "lead generation", "no-code", "form builder", "smart forms"],
  openGraph: {
    title: "SmartResponse.io — Build Forms That Think",
    description: "AI-powered forms that adapt to user answers and generate personalized content.",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Получаем версию из переменных окружения Vercel
  // NEXT_PUBLIC_ префикс делает переменную доступной в браузере
  const currentVersion =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    "dev"

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <QueryProvider>
          <LanguageProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
              <UpdateNotification currentVersion={currentVersion} />
            </ThemeProvider>
          </LanguageProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  )
}
