/**
 * ShareTab - Вкладка "Поделиться"
 * Отображает ссылку на форму и код для встраивания на сайт
 */
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Check, Link as LinkIcon, Code, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n"

interface ShareTabProps {
  formId: string | null
}

export function ShareTab({ formId }: ShareTabProps) {
  const { t } = useTranslation()
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)

  if (!formId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("editor.shareTab.noForm")}
      </div>
    )
  }

  const formUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/form/${formId}`
    : `/form/${formId}`
  
  const embedCode = `<iframe src="${formUrl}" width="100%" height="700" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`

  const copyToClipboard = async (text: string, type: "url" | "embed") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "url") {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        setCopiedEmbed(true)
        setTimeout(() => setCopiedEmbed(false), 2000)
      }
      toast.success(t("editor.shareTab.copiedToClipboard"))
    } catch (err) {
      toast.error(t("editor.shareTab.copyFailed"))
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mr-auto pb-10">
      
      {/* Прямая ссылка */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            {t("editor.shareTab.formLink")}
          </CardTitle>
          <CardDescription>
            Поделитесь этой ссылкой, чтобы люди могли заполнить вашу форму
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={formUrl}
              readOnly
              className="font-mono text-sm bg-muted"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => copyToClipboard(formUrl, "url")}
              title={t("editor.shareTab.copy")}
            >
              {copiedUrl ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              asChild
              title="Открыть в новой вкладке"
            >
              <a href={formUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Код для вставки */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Code className="h-5 w-5" />
            {t("editor.shareTab.embedCode")}
          </CardTitle>
          <CardDescription>
            Скопируйте этот код и вставьте его на свой сайт, чтобы отобразить форму
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              value={embedCode}
              readOnly
              rows={5}
              className="font-mono text-sm bg-muted resize-none pr-12"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 bg-background/50 hover:bg-background"
              onClick={() => copyToClipboard(embedCode, "embed")}
              title={t("editor.shareTab.copy")}
            >
              {copiedEmbed ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Вы можете настроить ширину (width) и высоту (height) в коде iframe, чтобы форма лучше вписывалась в дизайн вашего сайта.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
