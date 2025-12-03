"use server"

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { isFormOwner } from "@/app/actions/forms"

// Use service role to bypass RLS for server-side operations
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const TEST_EMAIL = "hello@vasilkov.digital"

interface CreateLeadParams {
  formId: string
  email: string
  url: string
  resultText: string
  resultImageUrl: string | null
}

export async function createLead({ formId, email, url, resultText, resultImageUrl }: CreateLeadParams) {
  const isTestEmail = email.toLowerCase() === TEST_EMAIL.toLowerCase()

  // Проверяем, является ли текущий авторизованный пользователь владельцем формы
  let isOwner = false
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (user) {
      isOwner = await isFormOwner(user.id, formId)
    }
  } catch (error) {
    // Если не удалось получить пользователя (например, анонимный запрос), продолжаем
    console.error("Error checking form owner:", error)
  }

  if (isTestEmail || isOwner) {
    // Для тестового email или владельца формы — удаляем предыдущую запись
    // Владелец может тестировать свою форму сколько угодно раз
    await supabaseAdmin.from("leads").delete().eq("form_id", formId).eq("email", email)
  } else {
    // Для обычных пользователей проверяем дубликаты email
    const { data: existing } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("form_id", formId)
      .eq("email", email)
      .single()

    if (existing) {
      return { error: "Вы уже отправляли заявку с этого email" }
    }
  }

  // Create lead with all data
  const { error: insertError } = await supabaseAdmin.from("leads").insert({
    id: crypto.randomUUID(),
    form_id: formId,
    email,
    url,
    result_text: resultText,
    result_image_url: resultImageUrl,
    status: "completed",
  })

  if (insertError) {
    return { error: "Ошибка при сохранении заявки" }
  }

  // Увеличиваем счетчик лидов только если это не тестовый email и не владелец формы
  // Владелец формы может использовать свою форму неограниченное количество раз
  if (!isTestEmail && !isOwner) {
    await supabaseAdmin.rpc("increment_lead_count", { form_id: formId })
  }

  return { success: true }
}

// Legacy function - kept for compatibility
export async function updateLeadWithEmail(
  leadId: string,
  formId: string,
  email: string,
  resultText: string,
  resultImageUrl: string | null,
) {
  return createLead({ formId, email, url: "", resultText, resultImageUrl })
}
