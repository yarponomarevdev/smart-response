/**
 * InlineEditableText - Компонент для inline редактирования текста
 * Отображает текст, который можно редактировать кликом
 */
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Pencil, Loader2 } from "lucide-react"

interface InlineEditableTextProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  placeholder?: string
  emptyText?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
}

export function InlineEditableText({
  value,
  onSave,
  placeholder = "Введите текст...",
  emptyText = "Нажмите для редактирования",
  className,
  inputClassName,
  disabled = false,
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Синхронизация с внешним значением
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value)
    }
  }, [value, isEditing])

  // Фокус на input при переходе в режим редактирования
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = useCallback(async () => {
    const trimmedValue = editValue.trim()
    
    // Если значение не изменилось, просто выходим из режима редактирования
    if (trimmedValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(trimmedValue)
      setIsEditing(false)
    } catch (error) {
      // При ошибке остаёмся в режиме редактирования
      console.error("Failed to save:", error)
    } finally {
      setIsSaving(false)
    }
  }, [editValue, value, onSave])

  const handleCancel = useCallback(() => {
    setEditValue(value)
    setIsEditing(false)
  }, [value])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSave()
      } else if (e.key === "Escape") {
        e.preventDefault()
        handleCancel()
      }
    },
    [handleSave, handleCancel]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || isSaving) return
      e.stopPropagation()
      setIsEditing(true)
    },
    [disabled, isSaving]
  )

  if (isEditing) {
    return (
      <div className="relative flex items-center min-w-0 flex-1 max-w-full">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSaving}
          className={cn(
            "h-7 py-0 px-2 text-sm w-full",
            inputClassName
          )}
        />
        {isSaving && (
          <Loader2 className="absolute right-2 h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
    )
  }

  return (
    <span
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 cursor-pointer rounded px-1 -mx-1 min-w-0 max-w-full",
        "hover:bg-muted/50 transition-colors group",
        disabled && "cursor-default hover:bg-transparent",
        !value && "text-muted-foreground italic",
        className
      )}
    >
      <span className="block min-w-0 truncate">{value || emptyText}</span>
      {!disabled && (
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </span>
  )
}


