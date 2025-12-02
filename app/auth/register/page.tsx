"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4 sm:px-6 md:px-[10%] lg:px-0 py-4">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-10 sm:col-start-2 md:col-start-5 md:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Проверьте почту</CardTitle>
                <CardDescription className="text-sm">
                  Мы отправили ссылку для подтверждения на {email}. После подтверждения вы сможете войти в систему.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full bg-transparent h-10 sm:h-11">
                    Вернуться к входу
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
      <div className="w-full max-w-7xl mx-auto grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-10 sm:col-start-2 md:col-start-5 md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Регистрация</CardTitle>
              <CardDescription className="text-sm">Создайте аккаунт для управления формами</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister}>
                <div className="flex flex-col gap-4 sm:gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Пароль</Label>
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
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full h-10 sm:h-11" disabled={isLoading}>
                    {isLoading ? "Регистрация..." : "Зарегистрироваться"}
                  </Button>
                  <p className="text-center text-xs sm:text-sm text-muted-foreground">
                    Уже есть аккаунт?{" "}
                    <Link href="/auth/login" className="text-primary hover:underline">
                      Войти
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
