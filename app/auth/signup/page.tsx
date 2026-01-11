"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"
import { LanguageToggle } from "@/components/language-toggle"

export default function SignUpPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
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

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      toast.success(t("auth.register.verifyEmailToast"))
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">{t("auth.register.checkEmailTitle")}</CardTitle>
            <CardDescription>
              {t("auth.register.checkEmailDescription", { email })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                {t("auth.register.backToLogin")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t("auth.register.title")}</CardTitle>
          <CardDescription>{t("auth.register.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t("auth.register.email")}
              </label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth.register.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t("auth.register.password")}
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                {t("auth.register.confirmPassword")}
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.register.registering") : t("auth.register.registerButton")}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t("auth.register.alreadyHaveAccount")}{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                {t("auth.register.loginLink")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
