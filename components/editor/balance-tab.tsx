/**
 * BalanceTab - Вкладка для отображения баланса пользователя
 * Показывает счетчики по формам и ответам, кнопку обновления тарифа
 * Доступна только для обычных пользователей (role: user)
 */
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, FileText, MessageSquare } from "lucide-react"
import { useUserForms } from "@/lib/hooks"
import { useTranslation } from "@/lib/i18n"

export function BalanceTab() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useUserForms()

  if (error) {
    return (
      <div className="py-4">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium mb-2">{t("errors.loadingFailed")}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return <div className="text-center py-12">{t("common.loading")}</div>
  }

  const { totalLeads, limitInfo } = data
  const isUnlimited = limitInfo?.limit === null

  const handleUpgrade = () => {
    window.open("https://t.me/vasilkovdigital", "_blank")
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">{t("balance.title")}</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {t("admin.panel.userDescription")}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Карточка форм */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base sm:text-lg">{t("balance.forms")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-bold">
                {limitInfo?.currentCount || 0}
                {!isUnlimited && (
                  <span className="text-lg sm:text-xl text-muted-foreground">
                    {" "}/ {limitInfo?.limit}
                  </span>
                )}
              </div>
              <CardDescription>
                {isUnlimited ? t("balance.unlimited") : t("balance.totalForms")}
              </CardDescription>
            </div>
          </CardContent>
        </Card>

        {/* Карточка ответов */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base sm:text-lg">{t("balance.responses")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-bold">{totalLeads}</div>
              <CardDescription>{t("balance.totalResponses")}</CardDescription>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Кнопка обновления тарифа */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="font-medium text-base sm:text-lg mb-1">
                {t("balance.upgradeTitle")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("balance.upgradeDescription")}
              </p>
            </div>
            <Button
              onClick={handleUpgrade}
              className="h-10 sm:h-[53px] px-4 sm:px-6 rounded-[18px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 text-sm sm:text-base w-full sm:w-auto"
            >
              {t("balance.upgradeButton")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
