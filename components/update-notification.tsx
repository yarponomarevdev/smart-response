"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"

interface UpdateNotificationProps {
  currentVersion: string
}

const VERSION_STORAGE_KEY = "app-version"

export function UpdateNotification({ currentVersion }: UpdateNotificationProps) {
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    // Проверяем только на клиенте
    if (typeof window === "undefined") return

    // Пропускаем для dev-версии
    if (currentVersion === "dev") {
      console.log("[UpdateNotification] Пропускаем проверку для dev-версии")
      return
    }

    const savedVersion = localStorage.getItem(VERSION_STORAGE_KEY)
    console.log("[UpdateNotification] Текущая версия:", currentVersion)
    console.log("[UpdateNotification] Сохраненная версия:", savedVersion)

    if (!savedVersion) {
      // Первый визит - сохраняем текущую версию без показа модалки
      console.log("[UpdateNotification] Первый визит, сохраняем версию")
      localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
    } else if (savedVersion !== currentVersion) {
      // Версия изменилась - показываем модалку
      console.log("[UpdateNotification] Версия изменилась! Показываем модалку")
      setShowModal(true)
    } else {
      console.log("[UpdateNotification] Версия не изменилась")
    }
  }, [currentVersion])

  const handleReload = () => {
    localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
    window.location.reload()
  }

  const handleDismiss = () => {
    localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
    setShowModal(false)
  }

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("update.title")}</DialogTitle>
          <DialogDescription>{t("update.description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDismiss}>
            {t("update.dismiss")}
          </Button>
          <Button type="button" onClick={handleReload}>
            {t("update.reload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
