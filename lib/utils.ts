import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Удаляет markdown форматирование из текста
 * Убирает: **жирный**, *курсив*, # заголовки, - списки, `код`, [ссылки](url)
 */
export function removeMarkdown(text: string): string {
  if (!text) return text

  return text
    // Удаляем заголовки (# ## ### и т.д.)
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // Удаляем жирный текст (**текст** или __текст__)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Удаляем курсив (*текст* или _текст_)
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Удаляем инлайн код (`код`)
    .replace(/`([^`]+)`/g, '$1')
    // Удаляем ссылки [текст](url) -> текст
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Удаляем маркеры списков (- * +)
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Удаляем нумерованные списки (1. 2. и т.д.)
    .replace(/^\d+\.\s+/gm, '')
    // Удаляем горизонтальные линии (--- или ***)
    .replace(/^[-*]{3,}$/gm, '')
    // Удаляем лишние пробелы в начале строк
    .replace(/^\s+/gm, '')
    // Удаляем множественные пустые строки
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}