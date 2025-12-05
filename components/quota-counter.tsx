"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface QuotaCounterProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function QuotaCounter({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  disabled = false,
  loading = false,
  className,
}: QuotaCounterProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || loading) return
    
    const inputValue = e.target.value
    
    // Разрешаем пустое поле для удобства редактирования
    if (inputValue === '') {
      onChange(min)
      return
    }
    
    const numValue = parseInt(inputValue, 10)
    
    // Проверяем что это валидное число
    if (isNaN(numValue)) return
    
    // Применяем ограничения min/max
    let newValue = numValue
    if (newValue < min) newValue = min
    if (max !== undefined && newValue > max) newValue = max
    
    onChange(newValue)
  }

  const handleBlur = () => {
    // При потере фокуса убеждаемся что значение валидно
    if (value < min) {
      onChange(min)
    }
    if (max !== undefined && value > max) {
      onChange(max)
    }
  }

  return (
    <div className={cn("flex items-center", className)}>
      <Input
        type="number"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled || loading}
        min={min}
        max={max}
        step={step}
        className={cn(
          "w-20 h-8 text-center text-sm font-medium tabular-nums",
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          loading && "opacity-50"
        )}
      />
    </div>
  )
}

