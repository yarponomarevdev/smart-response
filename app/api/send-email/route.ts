import { type NextRequest, NextResponse } from "next/server"
import { marked } from "marked"

// Настраиваем marked для правильной обработки списков
marked.setOptions({
  breaks: true,
  gfm: true,
})

// CORS заголовки для поддержки запросов с внешних сайтов
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Обработка preflight запросов
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Извлекает домен из URL для использования в пре-хедере
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return "нашем сайте"
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, resultText, resultImageUrl, resultType, url, formId } = await request.json()

    console.log("Получен запрос на отправку email для:", email)
    console.log("Тип результата:", resultType)

    if (!email || (!resultText && !resultImageUrl)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders })
    }

    // Загружаем настройки формы
    let headerTitle = "Ваш результат"
    let ctaText = ""
    let buttonText = ""
    let buttonUrl = ""

    if (formId) {
      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()

      // Загружаем первый h1 заголовок из динамических полей
      const { data: fields } = await supabase
        .from("form_fields")
        .select("field_label, field_type")
        .eq("form_id", formId)
        .eq("field_type", "h1")
        .order("position", { ascending: true })
        .limit(1)

      if (fields && fields.length > 0) {
        headerTitle = fields[0].field_label
      }

      // Загружаем CTA настройки из forms
      const { data: formData } = await supabase
        .from("forms")
        .select("cta_text, button_text, button_url")
        .eq("id", formId)
        .single()

      if (formData) {
        ctaText = formData.cta_text || ""
        buttonText = formData.button_text || ""
        buttonUrl = formData.button_url || ""
      }
    }

    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const fromEmail = "hello@vasilkov.digital"

    console.log("Отправка email с:", fromEmail, "на:", email)

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Ваш результат",
      html: generateEmailHTML(resultText, resultImageUrl, resultType, url, headerTitle, ctaText, buttonText, buttonUrl),
    })

    if (error) {
      console.error("Ошибка Resend:", error)
      return NextResponse.json(
        { error: "Failed to send email", details: error, success: false },
        { status: 500, headers: corsHeaders },
      )
    }

    console.log("Email успешно отправлен:", data)
    return NextResponse.json({ success: true, data }, { headers: corsHeaders })
  } catch (error: any) {
    console.error("Ошибка отправки email:", error)
    return NextResponse.json(
      { error: "Failed to send email", details: error.message, success: false },
      { status: 500, headers: corsHeaders },
    )
  }
}

function generateEmailHTML(
  resultText: string, 
  resultImageUrl: string | null, 
  resultType: string, 
  url: string,
  headerTitle: string,
  ctaText: string,
  buttonText: string,
  buttonUrl: string
) {
  // Конвертируем markdown в HTML для email (используем глобальные настройки marked)
  const htmlContent = resultText ? marked(resultText) : ""
  const domain = extractDomain(url)
  
  // Определяем, показывать ли CTA блок
  const showCTA = buttonText && buttonUrl
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ваш результат</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; color: #171717;">
        <span style="display:none !important; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">Вы заполнили форму на сайте ${domain}</span>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e5e5;">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #171717;">${headerTitle}</h1>
                  </td>
                </tr>
                
                ${
                  (resultType === "image" || resultType === "image_with_text") && resultImageUrl
                    ? `
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <img src="${resultImageUrl}" alt="Generated Recommendation" style="max-width: 100%; height: auto; border-radius: 4px;" />
                  </td>
                </tr>
                `
                    : ""
                }
                
                ${
                  resultText && (resultType === "text" || resultType === "image_with_text")
                    ? `
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <div style="margin-bottom: 20px; padding: 20px; background-color: #f5f5f5; border-radius: 4px;">
                      <div style="margin: 0; color: #404040; font-size: 15px; line-height: 1.8;">${htmlContent}</div>
                    </div>
                  </td>
                </tr>
                `
                    : ""
                }
                
                ${
                  showCTA
                    ? `
                <tr>
                  <td style="padding: ${ctaText ? '20px 40px 10px 40px' : '20px 40px 40px 40px'}; text-align: center;">
                    ${ctaText ? `<p style="margin: 0 0 16px 0; color: #171717; font-size: 16px; font-weight: 500;">${ctaText}</p>` : ''}
                    <a href="${buttonUrl}" style="display: inline-block; padding: 16px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 600;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
                `
                    : ""
                }
                
                
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}
