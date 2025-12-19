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
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface ShareTabProps {
  formId: string | null
}

export function ShareTab({ formId }: ShareTabProps) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)

  if (!formId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Форма не выбрана
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
      toast.success("Скопировано в буфер обмена")
    } catch (err) {
      toast.error("Не удалось скопировать")
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="form_url" className="text-sm">Ссылка на форму</Label>
        <div className="flex gap-2">
          <Input
            id="form_url"
            value={formUrl}
            readOnly
            className="h-10 sm:h-11 font-mono text-xs sm:text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
            onClick={() => copyToClipboard(formUrl, "url")}
          >
            {copiedUrl ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="embed_code" className="text-sm">Код для сайта</Label>
        <div className="flex flex-col gap-2">
          <Textarea
            id="embed_code"
            value={embedCode}
            readOnly
            rows={4}
            className="font-mono text-xs resize-none"
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 sm:h-11 w-full sm:w-auto"
            onClick={() => copyToClipboard(embedCode, "embed")}
          >
            {copiedEmbed ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Скопировано
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Скопировать код
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
