/**
 * BalanceTab - Вкладка для отображения баланса пользователя
 * Показывает счетчики по формам, ответам, хранилищу и тестированию
 * Доступна только для обычных пользователей (role: user)
 */
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, FileText, MessageSquare, HardDrive, Upload, FlaskConical } from "lucide-react"
import { useUserForms, useStorageUsage, useDailyTestInfo } from "@/lib/hooks"
import { useTranslation } from "@/lib/i18n"

export function BalanceTab() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useUserForms()
  const { data: storageData, isLoading: storageLoading } = useStorageUsage()
  const { data: testingData, isLoading: testingLoading } = useDailyTestInfo()

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

  const { totalLeads, limitInfo, maxLeads } = data
  const isUnlimited = limitInfo?.limit === null
  const isLeadsUnlimited = maxLeads === null

  // Форматирование хранилища
  const formatMB = (bytes: number) => Math.round(bytes / 1024 / 1024 * 10) / 10
  const storageCurrentMB = storageData ? formatMB(storageData.currentUsage) : 0
  const storageLimitMB = storageData?.limit ? formatMB(storageData.limit) : null
  const isStorageUnlimited = storageData?.limit === null

  // Данные тестирования
  const testingCurrent = testingData?.currentCount || 0
  const testingLimit = testingData?.limit
  const isTestingUnlimited = testingLimit === null

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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="text-3xl sm:text-4xl font-bold">
                {totalLeads}
                {!isLeadsUnlimited && maxLeads !== null && (
                  <span className="text-lg sm:text-xl text-muted-foreground">
                    {" "}/ {maxLeads}
                  </span>
                )}
              </div>
              <CardDescription>
                {isLeadsUnlimited ? t("balance.unlimited") : t("balance.totalResponses")}
              </CardDescription>
            </div>
          </CardContent>
        </Card>

        {/* Карточка хранилища */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base sm:text-lg">{t("balance.storage")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {storageLoading ? (
                <div className="text-3xl sm:text-4xl font-bold text-muted-foreground">...</div>
              ) : (
                <div className="text-3xl sm:text-4xl font-bold">
                  {storageCurrentMB}
                  {!isStorageUnlimited && storageLimitMB !== null && (
                    <span className="text-lg sm:text-xl text-muted-foreground">
                      {" "}/ {storageLimitMB} {t("balance.mb")}
                    </span>
                  )}
                  {isStorageUnlimited && (
                    <span className="text-lg sm:text-xl text-muted-foreground"> {t("balance.mb")}</span>
                  )}
                </div>
              )}
              <CardDescription>
                {isStorageUnlimited ? t("balance.unlimited") : t("balance.storageUsage")}
              </CardDescription>
            </div>
          </CardContent>
        </Card>

        {/* Карточка лимита загрузки */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base sm:text-lg">{t("balance.uploadLimit")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-bold">
                1 <span className="text-lg sm:text-xl text-muted-foreground">{t("balance.mb")}</span>
              </div>
              <CardDescription>{t("balance.maxFileSize")}</CardDescription>
            </div>
          </CardContent>
        </Card>

        {/* Карточка тестирования */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base sm:text-lg">{t("balance.testing")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testingLoading ? (
                <div className="text-3xl sm:text-4xl font-bold text-muted-foreground">...</div>
              ) : (
                <div className="text-3xl sm:text-4xl font-bold">
                  {testingCurrent}
                  {!isTestingUnlimited && testingLimit !== null && (
                    <span className="text-lg sm:text-xl text-muted-foreground">
                      {" "}/ {testingLimit}
                    </span>
                  )}
                </div>
              )}
              <CardDescription>
                {isTestingUnlimited ? (
                  t("balance.unlimited")
                ) : (
                  <>
                    {t("balance.testsToday")} ({t("balance.dailyReset")})
                  </>
                )}
              </CardDescription>
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
