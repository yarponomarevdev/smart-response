"use client"

import { useQuery } from "@tanstack/react-query"
import { getStorageUsage, getDailyTestInfo } from "@/app/actions/storage"
import { useCurrentUser } from "./use-auth"

/**
 * Интерфейс данных об использовании хранилища
 */
export interface StorageUsageData {
  currentUsage: number
  limit: number | null
}

/**
 * Интерфейс данных о тестированиях
 */
export interface DailyTestData {
  currentCount: number
  limit: number | null
  resetDate: string
}

/**
 * Хук для получения информации об использовании хранилища
 */
export function useStorageUsage() {
  const { data: user } = useCurrentUser()

  return useQuery({
    queryKey: ["storageUsage", user?.id],
    queryFn: () => getStorageUsage(user!.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 минуты
  })
}

/**
 * Хук для получения информации о тестированиях за день
 */
export function useDailyTestInfo() {
  const { data: user } = useCurrentUser()

  return useQuery({
    queryKey: ["dailyTestInfo", user?.id],
    queryFn: () => getDailyTestInfo(user!.id),
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 минута
  })
}

/**
 * Форматирование размера файла в байтах в человекочитаемый формат
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Б"
  
  const k = 1024
  const sizes = ["Б", "КБ", "МБ", "ГБ"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Форматирование размера в МБ
 */
export function formatMB(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${Math.round(mb * 10) / 10} МБ`
}
