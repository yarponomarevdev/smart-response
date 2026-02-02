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

export interface FormField {
  id: string
  form_id: string
  field_id: string
  label: string
  field_type: string
}

interface LeadsData {
  leads: Lead[]
  forms: Form[]
  formFields: FormField[]
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

    const { data: allFormFields } = await supabase
      .from("form_fields")
      .select("id, form_id, field_id, label, field_type")
      .order("display_order", { ascending: true })

    return {
      leads: allLeads || [],
      forms: allForms || [],
      formFields: allFormFields || [],
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

    const { data: formFields } = await supabase
      .from("form_fields")
      .select("id, form_id, field_id, label, field_type")
      .eq("form_id", propFormId)
      .order("display_order", { ascending: true })

    return {
      leads: data || [],
      forms: [],
      formFields: formFields || [],
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
    return { leads: [], forms: [], formFields: [], isSuperAdmin: false }
  }

  // Загружаем лиды по всем формам пользователя
  const formIds = userForms.map(f => f.id)
  const { data: leadsData } = await supabase
    .from("leads")
    .select("*")
    .in("form_id", formIds)
    .order("created_at", { ascending: false })

  const { data: userFormFields } = await supabase
    .from("form_fields")
    .select("id, form_id, field_id, label, field_type")
    .in("form_id", formIds)
    .order("display_order", { ascending: true })

  return {
    leads: leadsData || [],
    forms: userForms,
    formFields: userFormFields || [],
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
 * Использует optimistic update для мгновенного удаления из UI
 */
export function useDeleteLead() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()

  return useMutation({
    mutationFn: async (leadId: string) => {
      const result = await deleteLead(leadId)
      if ("error" in result) throw new Error(result.error)
      return { leadId }
    },
    onMutate: async (leadId) => {
      // Отменяем текущие запросы
      await queryClient.cancelQueries({ queryKey: ["leads"], exact: false })
      
      // Получаем все кэшированные данные лидов (могут быть разные queryKey)
      const previousLeadsQueries = queryClient.getQueriesData<LeadsData>({ queryKey: ["leads"] })
      
      // Optimistic: удаляем лид из всех кэшированных запросов
      previousLeadsQueries.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData<LeadsData>(queryKey, {
            ...data,
            leads: data.leads.filter(lead => lead.id !== leadId),
          })
        }
      })
      
      return { previousLeadsQueries }
    },
    onError: (_err, _variables, context) => {
      // Откатываем все изменения при ошибке
      if (context?.previousLeadsQueries) {
        context.previousLeadsQueries.forEach(([queryKey, data]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data)
          }
        })
      }
    },
    onSettled: () => {
      // Принудительно обновляем данные с сервера
      queryClient.refetchQueries({ queryKey: ["leads"], exact: false })
      queryClient.refetchQueries({ queryKey: ["forms"], exact: false })
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
 * Использует optimistic update для мгновенного обновления UI
 */
export function useUpdateLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateLeadParams) => {
      const result = await updateLead(params)
      if ("error" in result) throw new Error(result.error)
      return params
    },
    onMutate: async (params) => {
      const { leadId, lead_status, notes } = params
      
      // Отменяем текущие запросы
      await queryClient.cancelQueries({ queryKey: ["leads"], exact: false })
      
      // Получаем все кэшированные данные лидов
      const previousLeadsQueries = queryClient.getQueriesData<LeadsData>({ queryKey: ["leads"] })
      
      // Optimistic: обновляем лид во всех кэшированных запросах
      previousLeadsQueries.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData<LeadsData>(queryKey, {
            ...data,
            leads: data.leads.map(lead => {
              if (lead.id !== leadId) return lead
              return {
                ...lead,
                ...(lead_status !== undefined && { lead_status }),
                ...(notes !== undefined && { notes }),
              }
            }),
          })
        }
      })
      
      return { previousLeadsQueries }
    },
    onError: (_err, _variables, context) => {
      // Откатываем все изменения при ошибке
      if (context?.previousLeadsQueries) {
        context.previousLeadsQueries.forEach(([queryKey, data]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data)
          }
        })
      }
    },
    onSettled: () => {
      // Принудительно обновляем данные с сервера
      queryClient.refetchQueries({ queryKey: ["leads"], exact: false })
    },
  })
}

