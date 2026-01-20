"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface UpdateNotificationProps {
  currentVersion: string
  /** Интервал проверки в миллисекундах (по умолчанию 30 сек) */
  pollInterval?: number
}

const VERSION_STORAGE_KEY = "app-version"

export function UpdateNotification({
  currentVersion,
  pollInterval = 30000,
}: UpdateNotificationProps) {
  const [showNotification, setShowNotification] = useState(false)
  const [newVersion, setNewVersion] = useState<string | null>(null)
  const { t } = useTranslation()
  const initialVersionRef = useRef(currentVersion)

  // Функция проверки версии через API
  const checkForUpdate = useCallback(async () => {
    try {
      const response = await fetch("/api/version", { cache: "no-store" })
      if (!response.ok) return

      const data = await response.json()
      const serverVersion = data.version

      // Пропускаем dev-версию
      if (serverVersion === "dev") return

      // Сравниваем с версией, которая была при загрузке страницы
      if (serverVersion !== initialVersionRef.current) {
        console.log("[UpdateNotification] Обнаружена новая версия:", serverVersion)
        setNewVersion(serverVersion)
        setShowNotification(true)
      }
    } catch (error) {
      // Тихо игнорируем ошибки сети
      console.warn("[UpdateNotification] Ошибка проверки версии:", error)
    }
  }, [])

  // При монтировании сохраняем начальную версию
  useEffect(() => {
    if (typeof window === "undefined") return
    if (currentVersion === "dev") return

    // Сохраняем текущую версию в localStorage при первом визите
    const savedVersion = localStorage.getItem(VERSION_STORAGE_KEY)
    if (!savedVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
    }

    // Сохраняем начальную версию для сравнения
    initialVersionRef.current = currentVersion
  }, [currentVersion])

  // Polling для проверки обновлений
  useEffect(() => {
    if (typeof window === "undefined") return
    if (currentVersion === "dev") return

    // Первая проверка через 5 сек после загрузки
    const initialTimeout = setTimeout(checkForUpdate, 5000)

    // Периодическая проверка
    const interval = setInterval(checkForUpdate, pollInterval)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [checkForUpdate, pollInterval, currentVersion])

  const handleReload = () => {
    if (newVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, newVersion)
    }
    window.location.reload()
  }

  const handleDismiss = () => {
    if (newVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, newVersion)
    }
    setShowNotification(false)
  }

  if (!showNotification) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "w-80 max-w-[calc(100vw-2rem)]",
        "bg-background border border-border rounded-lg shadow-lg",
        "animate-in slide-in-from-right-5 fade-in duration-300"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t("update.title")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("update.description")}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3 ml-11">
          <Button size="sm" variant="outline" onClick={handleDismiss}>
            {t("update.dismiss")}
          </Button>
          <Button size="sm" onClick={handleReload}>
            {t("update.reload")}
          </Button>
        </div>
      </div>
    </div>
  )
}
