"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { deleteLead, updateLead } from "@/app/actions/leads"
import { useCurrentUser } from "./use-auth"

export type LeadStatus = 'todo' | 'in_progress' | 'done'

export interface Lead {
  id: string
  url: string
  email: string
  result_text: string | null
  result_image_url: string | null
  status: string
  lead_status: LeadStatus
  notes: string | null
  custom_fields: Record<string, unknown>
  created_at: string
  form_id: string | null
}

interface Form {
  id: string
  name: string
}

interface LeadsData {
  leads: Lead[]
  forms: Form[]
  isSuperAdmin: boolean
}

/**
 * Загрузка лидов пользователя
 */
async function fetchLeads(userId: string, propFormId?: string): Promise<LeadsData> {
  const supabase = createClient()

  // Проверяем роль пользователя
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single()

  const userRole = userData?.role || "user"
  const isSuperAdmin = userRole === "superadmin"

  // Если superadmin, показываем все лиды и все формы
  if (isSuperAdmin) {
    const { data: allForms } = await supabase
      .from("forms")
      .select("id, name")
      .order("created_at", { ascending: false })

    const { data: allLeads } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })

    return {
      leads: allLeads || [],
      forms: allForms || [],
      isSuperAdmin: true,
    }
  }

  // Если передан конкретный formId, показываем только его лиды
  if (propFormId) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("form_id", propFormId)
      .order("created_at", { ascending: false })

    return {
      leads: data || [],
      forms: [],
      isSuperAdmin: false,
    }
  }

  // Загружаем все формы пользователя
  const { data: userForms } = await supabase
    .from("forms")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })

  if (!userForms || userForms.length === 0) {
    return { leads: [], forms: [], isSuperAdmin: false }
  }

  // Загружаем лиды по всем формам пользователя
  const formIds = userForms.map(f => f.id)
  const { data: leadsData } = await supabase
    .from("leads")
    .select("*")
    .in("form_id", formIds)
    .order("created_at", { ascending: false })

  return {
    leads: leadsData || [],
    forms: userForms,
    isSuperAdmin: false,
  }
}

/**
 * Хук для получения лидов текущего пользователя
 */
export function useLeads(propFormId?: string) {
  const { data: user } = useCurrentUser()

  return useQuery({
    queryKey: ["leads", user?.id, propFormId],
    queryFn: () => fetchLeads(user!.id, propFormId),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут
  })
}

/**
 * Хук для удаления лида
 */
export function useDeleteLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (leadId: string) => {
      const result = await deleteLead(leadId)
      if ("error" in result) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      // Инвалидируем кэш лидов и форм (т.к. изменился счетчик)
      // Используем exact: false для инвалидации всех запросов с этими ключами
      queryClient.invalidateQueries({ queryKey: ["leads"], exact: false })
      queryClient.invalidateQueries({ queryKey: ["forms"], exact: false })
    },
  })
}

interface UpdateLeadParams {
  leadId: string
  lead_status?: LeadStatus
  notes?: string
}

/**
 * Хук для обновления лида (статус, заметки)
 */
export function useUpdateLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateLeadParams) => {
      const result = await updateLead(params)
      if ("error" in result) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"], exact: false })
    },
  })
}

