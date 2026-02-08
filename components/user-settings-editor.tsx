/**
 * UserSettingsEditor - Редактор пользовательских настроек
 * Доступен всем пользователям
 * Позволяет настраивать: email, пароль, удаление аккаунта
 */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CheckCircle2, Mail, Lock, Trash2, Monitor, Moon, Sun, Palette } from "lucide-react"
import { useCurrentUser, useUpdateEmail, useUpdatePassword, useDeleteAccount } from "@/lib/hooks"
import { useTranslation } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import { useUserTheme, type Theme as UserTheme } from "@/lib/hooks/use-user-theme"
import { cn } from "@/lib/utils"

export function UserSettingsEditor() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data: user } = useCurrentUser()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { saveTheme, isSaving: isThemeSaving } = useUserTheme()
  
  // Mutations
  const updateEmailMutation = useUpdateEmail()
  const updatePasswordMutation = useUpdatePassword()
  const deleteAccountMutation = useDeleteAccount()

  // Статусы операций
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle")
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "success" | "error">("idle")
  const [themeStatus, setThemeStatus] = useState<"idle" | "success" | "error">("idle")
  const [mounted, setMounted] = useState(false)

  // Формы
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Сбрасываем статусы через 3 секунды
  useEffect(() => {
    if (emailStatus !== "idle") {
      const timer = setTimeout(() => setEmailStatus("idle"), 5000)
      return () => clearTimeout(timer)
    }
  }, [emailStatus])

  useEffect(() => {
    if (passwordStatus !== "idle") {
      const timer = setTimeout(() => setPasswordStatus("idle"), 3000)
      return () => clearTimeout(timer)
    }
  }, [passwordStatus])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (themeStatus !== "idle") {
      const timer = setTimeout(() => setThemeStatus("idle"), 3000)
      return () => clearTimeout(timer)
    }
  }, [themeStatus])

  const handleEmailChange = async () => {
    setEmailStatus("idle")
    
    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return
    }

    try {
      await updateEmailMutation.mutateAsync(newEmail)
      setEmailStatus("success")
      setNewEmail("")
    } catch {
      setEmailStatus("error")
    }
  }

  const handlePasswordChange = async () => {
    setPasswordStatus("idle")
    setPasswordError("")

    // Валидация пароля
    if (newPassword.length < 6) {
      setPasswordError(t("settings.user.password.tooShort"))
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.user.password.mismatch"))
      return
    }

    try {
      await updatePasswordMutation.mutateAsync(newPassword)
      setPasswordStatus("success")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setPasswordStatus("error")
    }
  }

  const handleThemeChange = async (nextTheme: UserTheme) => {
    setThemeStatus("idle")

    // Помечаем, что тема выбрана вручную в этой сессии.
    // Это нужно, чтобы синхронизация темы из БД не перетёрла первый клик.
    if (typeof window !== "undefined") window.__srThemeUserOverride = true

    // Мгновенно применяем тему локально (быстрый отклик UI)
    setTheme(nextTheme)

    // Сохраняем в БД в фоне (для авторизованных пользователей)
    try {
      await saveTheme(nextTheme)
      setThemeStatus("success")
    } catch (error) {
      console.error("[UserSettingsEditor] Не удалось сохранить тему:", error)
      setThemeStatus("error")
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteAccountMutation.mutateAsync()
      // Выход из системы
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/auth/login")
    } catch {
      setDeleteDialogOpen(false)
    }
  }

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)

  return (
    <div className="py-4 space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t("settings.user.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.user.description")}</p>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        {/* Карточка Email */}
        <Card className="py-4 gap-4">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">{t("settings.user.email.label")}</CardTitle>
            </div>
            <CardDescription className="text-xs">{t("settings.user.email.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("settings.user.email.current")}</Label>
              <Input value={user?.email || ""} disabled className="bg-muted/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-email" className="text-xs">{t("settings.user.email.newEmail")}</Label>
              <Input
                id="new-email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t("settings.user.email.newEmailPlaceholder")}
                className="h-9 text-sm"
              />
            </div>
            {emailStatus === "success" && (
              <p className="text-xs text-green-600 flex items-center">
                <CheckCircle2 className="h-3 w-3 mr-1.5" />
                {t("settings.user.email.verificationSent")}
              </p>
            )}
            {(emailStatus === "error" || updateEmailMutation.error) && (
              <p className="text-xs text-destructive">
                {updateEmailMutation.error?.message || t("errors.savingFailed")}
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end border-t pt-4">
            <Button
              onClick={handleEmailChange}
              disabled={!isEmailValid || updateEmailMutation.isPending}
              size="sm"
            >
              {updateEmailMutation.isPending ? t("settings.user.email.changing") : t("settings.user.email.change")}
            </Button>
          </CardFooter>
        </Card>

        {/* Карточка Пароля */}
        <Card className="py-4 gap-4">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">{t("settings.user.password.label")}</CardTitle>
            </div>
            <CardDescription className="text-xs">{t("settings.user.password.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs">{t("settings.user.password.newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setPasswordError("")
                }}
                placeholder={t("settings.user.password.newPasswordPlaceholder")}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs">{t("settings.user.password.confirmPassword")}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setPasswordError("")
                }}
                placeholder={t("settings.user.password.confirmPasswordPlaceholder")}
                className="h-9 text-sm"
              />
            </div>
            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
            {passwordStatus === "success" && (
              <p className="text-xs text-green-600 flex items-center">
                <CheckCircle2 className="h-3 w-3 mr-1.5" />
                {t("settings.user.password.changed")}
              </p>
            )}
            {(passwordStatus === "error" || updatePasswordMutation.error) && !passwordError && (
              <p className="text-xs text-destructive">
                {updatePasswordMutation.error?.message || t("errors.savingFailed")}
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end border-t pt-4">
            <Button
              onClick={handlePasswordChange}
              disabled={!newPassword || !confirmPassword || updatePasswordMutation.isPending}
              size="sm"
            >
              {updatePasswordMutation.isPending ? t("settings.user.password.changing") : t("settings.user.password.change")}
            </Button>
          </CardFooter>
        </Card>

        {/* Карточка Темы */}
        <Card className="py-4 gap-4">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">{t("settings.user.appearance.title")}</CardTitle>
            </div>
            <CardDescription className="text-xs">{t("settings.user.appearance.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!mounted ? (
              <div className="text-xs text-muted-foreground">{t("common.loading")}</div>
            ) : (
              <>
                <RadioGroup
                  value={(theme ?? "light") as UserTheme}
                  onValueChange={(value) => void handleThemeChange(value as UserTheme)}
                  className="grid grid-cols-3 gap-3"
                >
                  <div>
                    <RadioGroupItem value="light" id="theme-light" className="peer sr-only" />
                    <Label
                      htmlFor="theme-light"
                      className={cn(
                        "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                        "peer-data-[state=checked]:border-primary"
                      )}
                    >
                      <Sun className="mb-2 h-5 w-5" />
                      <span className="text-xs font-medium">{t("settings.user.appearance.light")}</span>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="dark" id="theme-dark" className="peer sr-only" />
                    <Label
                      htmlFor="theme-dark"
                      className={cn(
                        "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                        "peer-data-[state=checked]:border-primary"
                      )}
                    >
                      <Moon className="mb-2 h-5 w-5" />
                      <span className="text-xs font-medium">{t("settings.user.appearance.dark")}</span>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="system" id="theme-system" className="peer sr-only" />
                    <Label
                      htmlFor="theme-system"
                      className={cn(
                        "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                        "peer-data-[state=checked]:border-primary"
                      )}
                    >
                      <Monitor className="mb-2 h-5 w-5" />
                      <span className="text-xs font-medium">{t("settings.user.appearance.system")}</span>
                    </Label>
                  </div>
                </RadioGroup>

                {theme === "system" && (resolvedTheme === "light" || resolvedTheme === "dark") && (
                  <p className="text-xs text-muted-foreground">
                    {resolvedTheme === "dark"
                      ? t("settings.user.appearance.systemHintDark")
                      : t("settings.user.appearance.systemHintLight")}
                  </p>
                )}

                {isThemeSaving && (
                  <p className="text-xs text-muted-foreground">{t("common.saving")}</p>
                )}
                {themeStatus === "success" && (
                  <p className="text-xs text-green-600 flex items-center">
                    <CheckCircle2 className="h-3 w-3 mr-1.5" />
                    {t("notifications.saved")}
                  </p>
                )}
                {themeStatus === "error" && (
                  <p className="text-xs text-destructive">{t("errors.savingFailed")}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Карточка Удаления аккаунта */}
        <Card className="border-destructive/20 bg-destructive/5 py-4 gap-4">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              <CardTitle className="text-destructive text-base">{t("settings.user.account.label")}</CardTitle>
            </div>
            <CardDescription className="text-xs">{t("settings.user.account.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t("settings.user.account.confirmMessage")}
            </p>
            {deleteAccountMutation.error && (
              <p className="text-xs text-destructive mt-2">
                {deleteAccountMutation.error?.message || t("errors.savingFailed")}
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end border-t border-destructive/10 pt-4">
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  {t("settings.user.account.deleteButton")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.user.account.confirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.user.account.confirmMessage")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteAccountMutation.isPending
                      ? t("settings.user.account.deleting")
                      : t("settings.user.account.confirmButton")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    __srThemeUserOverride?: boolean
  }
}
