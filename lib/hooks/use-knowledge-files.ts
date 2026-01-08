"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface KnowledgeFile {
  id: string
  form_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  created_at: string
}

/**
 * Получение списка файлов базы знаний для формы
 */
async function fetchKnowledgeFiles(formId: string): Promise<KnowledgeFile[]> {
  const response = await fetch(`/api/knowledge-files?formId=${formId}`)
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || "Ошибка загрузки файлов")
  }

  const data = await response.json()
  return data.files
}

/**
 * Загрузка файла
 */
async function uploadKnowledgeFile(formId: string, file: File): Promise<KnowledgeFile> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("formId", formId)

  const response = await fetch("/api/knowledge-files", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || "Ошибка загрузки файла")
  }

  const data = await response.json()
  return data.file
}

/**
 * Удаление файла
 */
async function deleteKnowledgeFile(fileId: string): Promise<void> {
  const response = await fetch(`/api/knowledge-files?fileId=${fileId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || "Ошибка удаления файла")
  }
}

/**
 * Хук для получения списка файлов базы знаний
 */
export function useKnowledgeFiles(formId: string | null) {
  return useQuery({
    queryKey: ["knowledgeFiles", formId],
    queryFn: () => fetchKnowledgeFiles(formId!),
    enabled: !!formId,
    staleTime: 5 * 60 * 1000, // 5 минут
  })
}

/**
 * Хук для загрузки файла
 */
export function useUploadKnowledgeFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ formId, file }: { formId: string; file: File }) => {
      return uploadKnowledgeFile(formId, file)
    },
    onSuccess: (_, variables) => {
      // Инвалидируем кэш файлов для этой формы
      queryClient.invalidateQueries({ queryKey: ["knowledgeFiles", variables.formId] })
    },
  })
}

/**
 * Хук для удаления файла
 */
export function useDeleteKnowledgeFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ fileId, formId }: { fileId: string; formId: string }) => {
      await deleteKnowledgeFile(fileId)
      return { formId }
    },
    onSuccess: (data) => {
      // Инвалидируем кэш файлов для этой формы
      queryClient.invalidateQueries({ queryKey: ["knowledgeFiles", data.formId] })
    },
  })
}

/**
 * Форматирование размера файла
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Б"
  
  const k = 1024
  const sizes = ["Б", "КБ", "МБ", "ГБ"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
