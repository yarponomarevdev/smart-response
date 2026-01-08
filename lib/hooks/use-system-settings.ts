"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getSystemSetting, updateSystemSetting } from "@/app/actions/system-settings"
import { useCurrentUser } from "./use-auth"

interface SystemSettings {
  globalTextPrompt: string
  globalImagePrompt: string
  textModel: string
  imageModel: string
}

/**
 * Загрузка системных настроек
 */
async function fetchSystemSettings(): Promise<SystemSettings> {
  const [textPromptResult, imagePromptResult, textModelResult, imageModelResult] = await Promise.all([
    getSystemSetting("global_text_prompt"),
    getSystemSetting("global_image_prompt"),
    getSystemSetting("text_model"),
    getSystemSetting("image_model"),
  ])

  if (textPromptResult.error) throw new Error(textPromptResult.error)
  if (imagePromptResult.error) throw new Error(imagePromptResult.error)
  if (textModelResult.error) throw new Error(textModelResult.error)
  if (imageModelResult.error) throw new Error(imageModelResult.error)

  return {
    globalTextPrompt: textPromptResult.value || "",
    globalImagePrompt: imagePromptResult.value || "",
    textModel: textModelResult.value || "",
    imageModel: imageModelResult.value || "",
  }
}

/**
 * Хук для получения системных настроек
 */
export function useSystemSettings() {
  return useQuery({
    queryKey: ["systemSettings"],
    queryFn: fetchSystemSettings,
    staleTime: 5 * 60 * 1000, // 5 минут
  })
}

/**
 * Хук для сохранения системных настроек
 */
export function useSaveSystemSettings() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  return useMutation({
    mutationFn: async ({
      globalTextPrompt,
      globalImagePrompt,
      textModel,
      imageModel,
    }: {
      globalTextPrompt: string
      globalImagePrompt: string
      textModel: string
      imageModel: string
    }) => {
      if (!user) throw new Error("Пользователь не авторизован")

      const [textPromptResult, imagePromptResult, textModelResult, imageModelResult] = await Promise.all([
        updateSystemSetting(user.id, "global_text_prompt", globalTextPrompt),
        updateSystemSetting(user.id, "global_image_prompt", globalImagePrompt),
        updateSystemSetting(user.id, "text_model", textModel),
        updateSystemSetting(user.id, "image_model", imageModel),
      ])

      if (!textPromptResult.success) throw new Error(textPromptResult.error || "Ошибка сохранения текстового промпта")
      if (!imagePromptResult.success) throw new Error(imagePromptResult.error || "Ошибка сохранения промпта изображений")
      if (!textModelResult.success) throw new Error(textModelResult.error || "Ошибка сохранения модели текста")
      if (!imageModelResult.success) throw new Error(imageModelResult.error || "Ошибка сохранения модели изображений")

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] })
    },
  })
}

