'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error('Ошибка при подтверждении:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isLoading}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Хук для удобного использования confirm dialog
interface UseConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

export function useConfirm() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [options, setOptions] = React.useState<UseConfirmOptions>({
    title: '',
  })
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null)

  const confirm = React.useCallback(
    (opts: UseConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        // Если уже есть незавершенный Promise, отклоняем его (пользователь закрыл диалог или вызвал новый)
        if (resolveRef.current) {
          resolveRef.current(false)
        }
        
        setOptions(opts)
        setIsOpen(true)
        resolveRef.current = resolve
      })
    },
    []
  )

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open && resolveRef.current) {
      resolveRef.current(false)
      resolveRef.current = null
    }
  }

  const handleConfirm = async () => {
    if (resolveRef.current) {
      resolveRef.current(true)
      resolveRef.current = null
    }
  }

  const ConfirmDialogComponent = (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={options.title}
      description={options.description}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      variant={options.variant}
      onConfirm={handleConfirm}
    />
  )

  return { confirm, ConfirmDialog: ConfirmDialogComponent }
}

