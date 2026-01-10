"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

interface AdminHeaderProps {
  isSuperAdmin?: boolean
}

export function AdminHeader({ isSuperAdmin = false }: AdminHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const headerText = isSuperAdmin ? "Lead Hero SuperAdmin" : "Lead Hero Admin"

  return (
    <div className="w-full pt-1 sm:pt-2">
      <header className="bg-card border border-border rounded-xl shadow-sm">
        <div className="flex items-center justify-between p-3 sm:p-4">
          <h2 className="text-lg sm:text-xl font-semibold truncate">{headerText}</h2>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Button onClick={handleLogout} className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[18px] bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800 border border-border text-sm sm:text-base transition-colors">
              <LogOut className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Выход</span>
            </Button>
          </div>
        </div>
      </header>
    </div>
  )
}
