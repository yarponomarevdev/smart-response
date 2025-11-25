"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AuthHeader() {
  return (
    <div className="fixed top-0 right-0 p-6 z-50 flex gap-3">
      <Link href="/auth/login">
        <Button variant="outline" className="bg-card/80 backdrop-blur-sm border-border hover:bg-card">
          Login
        </Button>
      </Link>
      <Link href="/auth/signup">
        <Button className="bg-primary hover:bg-primary/90">Sign Up</Button>
      </Link>
    </div>
  )
}
