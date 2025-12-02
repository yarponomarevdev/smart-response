"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AuthHeader() {
  return (
    <div className="fixed top-0 right-0 p-2 sm:p-4 md:p-6 z-50 flex gap-2 sm:gap-3">
      <Link href="/auth/login">
        <Button variant="outline" className="bg-card/80 backdrop-blur-sm border-border hover:bg-card h-8 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
          <span className="hidden sm:inline">Login</span>
          <span className="sm:hidden">Вход</span>
        </Button>
      </Link>
      <Link href="/auth/signup">
        <Button className="bg-primary hover:bg-primary/90 h-8 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
          <span className="hidden sm:inline">Sign Up</span>
          <span className="sm:hidden">Регистр.</span>
        </Button>
      </Link>
    </div>
  )
}
