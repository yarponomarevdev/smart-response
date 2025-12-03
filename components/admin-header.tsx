"use client"

import { Button } from "@/components/ui/button"
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
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex items-center justify-between p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-semibold truncate">{headerText}</h2>
        <Button onClick={handleLogout} variant="outline" size="sm" className="h-9 sm:h-10 text-xs sm:text-sm">
          <LogOut className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Logout</span>
          <span className="sm:hidden">Выход</span>
        </Button>
      </div>
    </header>
  )
}
