"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"
import { LanguageToggle } from "@/components/language-toggle"

export default function RegisterPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError(t("auth.register.passwordMismatch"))
      return
    }

    if (password.length < 6) {
      setError(t("auth.register.passwordTooShort"))
      return
    }

    const supabase = createClient()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      setSuccess(true)
      toast.success(t("auth.register.verifyEmailToast"))
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
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
                <CardTitle className="text-xl sm:text-2xl">{t("auth.register.checkEmailTitle")}</CardTitle>
                <CardDescription className="text-sm">
                  {t("auth.register.checkEmailDescription", { email })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full bg-transparent h-10 sm:h-11">
                    {t("auth.register.backToLogin")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
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
              <CardTitle className="text-xl sm:text-2xl">{t("auth.register.title")}</CardTitle>
              <CardDescription className="text-sm">{t("auth.register.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister}>
                <div className="flex flex-col gap-4 sm:gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">{t("auth.register.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.register.emailPlaceholder")}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">{t("auth.register.password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">{t("auth.register.confirmPassword")}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full h-10 sm:h-11" disabled={isLoading}>
                    {isLoading ? t("auth.register.registering") : t("auth.register.registerButton")}
                  </Button>
                  <p className="text-center text-xs sm:text-sm text-muted-foreground">
                    {t("auth.register.alreadyHaveAccount")}{" "}
                    <Link href="/auth/login" className="text-primary hover:underline">
                      {t("auth.register.loginLink")}
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
