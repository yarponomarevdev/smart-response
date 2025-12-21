"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button 
        className="h-10 sm:h-[53px] w-10 sm:w-[53px] rounded-[18px] bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800 border border-border transition-colors" 
        disabled
      >
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Переключить тему</span>
      </Button>
    )
  }

  return (
    <Button
      className="h-10 sm:h-[53px] w-10 sm:w-[53px] rounded-[18px] bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800 border border-border transition-colors"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
      )}
      <span className="sr-only">Переключить тему</span>
    </Button>
  )
}

