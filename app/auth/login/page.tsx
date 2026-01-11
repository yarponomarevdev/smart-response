"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { useTranslation } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"
import { ensureUserExists } from "@/app/actions/users"

export default function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      // Проверяем/создаём запись в таблице users через server action
      // Это предотвращает бесконечную загрузку дашборда для новых пользователей
      if (data.user) {
        await ensureUserExists(data.user.id, data.user.email!)
      }

      router.push("/admin")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 sm:px-6 md:px-[10%] lg:px-0 py-4">
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-10 sm:col-start-2 md:col-start-5 md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">{t("auth.login.title")}</CardTitle>
              <CardDescription className="text-sm">{t("auth.login.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-4 sm:gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">{t("auth.login.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.login.emailPlaceholder")}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">{t("auth.login.password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full h-10 sm:h-11" disabled={isLoading}>
                    {isLoading ? t("auth.login.loggingIn") : t("auth.login.loginButton")}
                  </Button>
                  <p className="text-center text-xs sm:text-sm text-muted-foreground">
                    {t("auth.login.noAccount")}{" "}
                    <Link href="/auth/register" className="text-primary hover:underline">
                      {t("auth.login.registerLink")}
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
