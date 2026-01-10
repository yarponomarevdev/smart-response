"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from "@/lib/i18n"

export function AuthHeader() {
  const { t } = useTranslation()
  
  return (
    <div className="fixed top-0 right-0 p-2 sm:p-4 md:p-6 z-50 flex gap-2 sm:gap-3">
      <LanguageToggle />
      <ThemeToggle />
      <Link href="/auth/login">
        <Button className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[18px] bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800 border border-border text-sm sm:text-base transition-colors">
          <span className="hidden sm:inline">{t("common.login")}</span>
          <span className="sm:hidden">{t("common.login")}</span>
        </Button>
      </Link>
      <Link href="/auth/signup">
        <Button className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[18px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 text-sm sm:text-base">
          <span className="hidden sm:inline">{t("common.signup")}</span>
          <span className="sm:hidden">{t("common.signupShort")}</span>
        </Button>
      </Link>
    </div>
  )
}
