"use server"

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { isFormOwner } from "@/app/actions/forms"
import { marked } from "marked"

// Use service role to bypass RLS for server-side operations
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const TEST_EMAIL = "hello@vasilkov.digital"

// Настройка marked для email
marked.setOptions({
  breaks: true,
  gfm: true,
})

interface CreateLeadParams {
  formId: string
  email: string
  url: string
  resultText: string
  resultImageUrl: string | null
}

interface SendOwnerNotificationParams {
  formId: string
  leadEmail: string
  url: string
  resultText: string
  resultImageUrl: string | null
}

/**
 * Отправляет email уведомление владельцу формы о новом лиде
 */
async function sendOwnerNotification({ formId, leadEmail, url, resultText, resultImageUrl }: SendOwnerNotificationParams) {
  try {
    // Получаем данные формы с настройкой уведомлений и владельцем
    const { data: form, error: formError } = await supabaseAdmin
      .from("forms")
      .select("name, owner_id, notify_on_new_lead")
      .eq("id", formId)
      .single()

    if (formError || !form) {
      console.error("[Notification] Form not found:", formError)
      return
    }

    // Проверяем, включены ли уведомления для этой формы
    if (form.notify_on_new_lead === false) {
      console.log("[Notification] Notifications disabled for form:", formId)
      return
    }

    // Получаем email владельца
    const { data: owner, error: ownerError } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", form.owner_id)
      .single()

    if (ownerError || !owner?.email) {
      console.error("[Notification] Owner not found:", ownerError)
      return
    }

    // Отправляем email через Resend
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const fromEmail = "hello@vasilkov.digital"
    const subject = `Новая заявка с формы "${form.name}"`

    console.log("[Notification] Sending notification to owner:", owner.email, "for form:", form.name)

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: [owner.email],
      subject,
      html: generateOwnerNotificationHTML({
        formName: form.name,
        leadEmail,
        url,
        resultText,
        resultImageUrl,
      }),
    })

    if (sendError) {
      console.error("[Notification] Failed to send email:", sendError)
    } else {
      console.log("[Notification] Email sent successfully to:", owner.email)
    }
  } catch (error) {
    console.error("[Notification] Unexpected error:", error)
  }
}

/**
 * Генерирует HTML для email уведомления владельцу
 */
function generateOwnerNotificationHTML({
  formName,
  leadEmail,
  url,
  resultText,
  resultImageUrl,
}: {
  formName: string
  leadEmail: string
  url: string
  resultText: string
  resultImageUrl: string | null
}) {
  const htmlContent = resultText ? marked(resultText) : ""
  const dashboardUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartresponse.io"

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Новая заявка - ${formName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #171717; border-radius: 8px; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff;">
                      🎉 Новая заявка с формы
                    </h1>
                    <p style="margin: 16px 0 0 0; font-size: 20px; color: #a3a3a3;">
                      "${formName}"
                    </p>
                  </td>
                </tr>
                
                <!-- Lead Info -->
                <tr>
                  <td style="padding: 20px 40px;">
                    <div style="background-color: #262626; border-radius: 8px; padding: 20px;">
                      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.5px;">
                        Информация о лиде
                      </h3>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0; color: #a3a3a3; font-size: 14px; width: 80px;">Email:</td>
                          <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                            <a href="mailto:${leadEmail}" style="color: #60a5fa; text-decoration: none;">${leadEmail}</a>
                          </td>
                        </tr>
                        ${url ? `
                        <tr>
                          <td style="padding: 8px 0; color: #a3a3a3; font-size: 14px; width: 80px;">URL:</td>
                          <td style="padding: 8px 0; color: #ffffff; font-size: 14px; word-break: break-all;">
                            <a href="${url}" style="color: #60a5fa; text-decoration: none;">${url}</a>
                          </td>
                        </tr>
                        ` : ""}
                      </table>
                    </div>
                  </td>
                </tr>
                
                <!-- Result Image -->
                ${resultImageUrl ? `
                <tr>
                  <td style="padding: 20px 40px;">
                    <div style="background-color: #262626; border-radius: 8px; padding: 20px;">
                      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.5px;">
                        Сгенерированное изображение
                      </h3>
                      <img src="${resultImageUrl}" alt="Результат" style="max-width: 100%; height: auto; border-radius: 4px;" />
                    </div>
                  </td>
                </tr>
                ` : ""}
                
                <!-- Result Text -->
                ${resultText ? `
                <tr>
                  <td style="padding: 20px 40px;">
                    <div style="background-color: #262626; border-radius: 8px; padding: 20px;">
                      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.5px;">
                        Ответ формы
                      </h3>
                      <div style="color: #d4d4d4; font-size: 14px; line-height: 1.7;">${htmlContent}</div>
                    </div>
                  </td>
                </tr>
                ` : ""}
                
                <!-- CTA Button -->
                <tr>
                  <td style="padding: 30px 40px 40px 40px; text-align: center;">
                    <a href="${dashboardUrl}/admin" style="display: inline-block; padding: 16px 32px; background-color: #59191f; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Перейти в личный кабинет
                    </a>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #262626;">
                    <p style="margin: 0; color: #737373; font-size: 12px;">
                      Это автоматическое уведомление от SmartResponse.io
                    </p>
                    <p style="margin: 8px 0 0 0; color: #525252; font-size: 11px;">
                      Вы можете отключить уведомления в настройках формы
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

/**
 * Проверяет лимит лидов для владельца формы
 * @returns true если лимит не превышен или нет лимита, false если превышен
 */
async function checkLeadLimit(ownerId: string): Promise<{ canCreate: boolean; currentCount: number; limit: number | null }> {
  // Получаем max_leads пользователя
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("max_leads")
    .eq("id", ownerId)
    .single()

  const maxLeads = user?.max_leads ?? null // NULL = неограниченно

  // Получаем текущее количество лидов по всем формам пользователя
  const { data: forms } = await supabaseAdmin
    .from("forms")
    .select("lead_count")
    .eq("owner_id", ownerId)

  const currentCount = forms?.reduce((sum, f) => sum + (f.lead_count || 0), 0) || 0

  // Если max_leads = NULL, лимита нет
  if (maxLeads === null) {
    return { canCreate: true, currentCount, limit: null }
  }

  return { canCreate: currentCount < maxLeads, currentCount, limit: maxLeads }
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

  // Проверяем лимит лидов для владельца формы (если это не тестовый email и не владелец)
  if (!isTestEmail && !isOwner) {
    // Получаем владельца формы
    const { data: form } = await supabaseAdmin
      .from("forms")
      .select("owner_id")
      .eq("id", formId)
      .single()

    if (form?.owner_id) {
      const { canCreate, currentCount, limit } = await checkLeadLimit(form.owner_id)
      if (!canCreate) {
        const limitText = limit !== null ? `${currentCount}/${limit}` : currentCount.toString()
        return { error: `Достигнут лимит лидов для аккаунта (${limitText}). Владельцу необходимо связаться с администратором.` }
      }
    }
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

  // Отправляем уведомление владельцу формы (асинхронно, не блокируем ответ)
  sendOwnerNotification({
    formId,
    leadEmail: email,
    url,
    resultText,
    resultImageUrl,
  }).catch((error) => {
    console.error("[Notification] Failed to send owner notification:", error)
  })

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
