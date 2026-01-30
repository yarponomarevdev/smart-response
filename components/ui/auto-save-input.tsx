"use client"

import { forwardRef } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"
import type { AutoSaveStatus } from "@/lib/hooks/use-autosave"

interface SaveStatusIndicatorProps {
  status: AutoSaveStatus
  className?: string
}

/**
 * Индикатор статуса сохранения
 */
export function SaveStatusIndicator({ status, className }: SaveStatusIndicatorProps) {
  const { t } = useTranslation()
  
  if (status === "idle") return null

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-sm transition-opacity duration-200",
        status === "saving" && "text-muted-foreground",
        status === "saved" && "text-green-600 dark:text-green-500",
        status === "error" && "text-red-500",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("common.saving")}</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-4 w-4" />
          <span>{t("common.saved")}</span>
        </>
      )}
      {status === "error" && (
        <span>{t("common.saveError")}</span>
      )}
    </div>
  )
}

interface AutoSaveInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string
  onChange: (value: string) => void
  status: AutoSaveStatus
  /** Показывать индикатор справа от label */
  showStatusInline?: boolean
}

/**
 * Input с автосохранением и индикатором статуса
 */
export const AutoSaveInput = forwardRef<HTMLInputElement, AutoSaveInputProps>(
  ({ value, onChange, status, showStatusInline = false, className, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          {...props}
        />
        {!showStatusInline && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <SaveStatusIndicator status={status} />
          </div>
        )}
      </div>
    )
  }
)
AutoSaveInput.displayName = "AutoSaveInput"

interface AutoSaveTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  value: string
  onChange: (value: string) => void
  status: AutoSaveStatus
}

/**
 * Textarea с автосохранением и индикатором статуса
 */
export const AutoSaveTextarea = forwardRef<HTMLTextAreaElement, AutoSaveTextareaProps>(
  ({ value, onChange, status, className, ...props }, ref) => {
    return (
      <div className="relative">
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          {...props}
        />
        <div className="absolute right-3 bottom-3">
          <SaveStatusIndicator status={status} />
        </div>
      </div>
    )
  }
)
AutoSaveTextarea.displayName = "AutoSaveTextarea"

interface AutoSaveFieldWrapperProps {
  label: React.ReactNode
  labelFor?: string
  status: AutoSaveStatus
  children: React.ReactNode
  description?: string
  counter?: { current: number; max: number }
  className?: string
}

/**
 * Обертка для поля с label и индикатором статуса справа от label
 */
export function AutoSaveFieldWrapper({
  label,
  labelFor,
  status,
  children,
  description,
  counter,
  className,
}: AutoSaveFieldWrapperProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={labelFor} className="text-base sm:text-lg">
          {label}
        </label>
        <SaveStatusIndicator status={status} />
      </div>
      {description && (
        <p className="text-xs sm:text-sm text-muted-foreground italic">{description}</p>
      )}
      {children}
      {counter && (
        <p className="text-xs text-muted-foreground">
          {counter.current}/{counter.max} символов
        </p>
      )}
    </div>
  )
}

