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
    const { email, resultText, resultImageUrl, resultType, url } = await request.json()

    console.log("[v0] Email request received for:", email)
    console.log("[v0] Result type:", resultType)

    if (!email || (!resultText && !resultImageUrl)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders })
    }

    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const fromEmail = "hello@vasilkov.digital"

    console.log("[v0] Sending email from:", fromEmail, "to:", email)

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Ваш результат",
      html: generateEmailHTML(resultText, resultImageUrl, resultType, url),
    })

    if (error) {
      console.error("[v0] Resend error:", error)
      return NextResponse.json(
        { error: "Failed to send email", details: error, success: false },
        { status: 500, headers: corsHeaders },
      )
    }

    console.log("[v0] Email sent successfully:", data)
    return NextResponse.json({ success: true, data }, { headers: corsHeaders })
  } catch (error: any) {
    console.error("[v0] Error sending email:", error)
    return NextResponse.json(
      { error: "Failed to send email", details: error.message, success: false },
      { status: 500, headers: corsHeaders },
    )
  }
}

function generateEmailHTML(resultText: string, resultImageUrl: string | null, resultType: string, url: string) {
  // Конвертируем markdown в HTML для email (используем глобальные настройки marked)
  const htmlContent = resultText ? marked(resultText) : ""
  const domain = extractDomain(url)
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ваш результат</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff;">
        <span style="display:none !important; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">Вы заполнили форму на сайте ${domain}</span>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #171717; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ffffff;">Your Personalized Recommendations</h1>
                  </td>
                </tr>
                
                ${
                  resultType === "image" && resultImageUrl
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
                  resultText
                    ? `
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <div style="margin-bottom: 20px; padding: 20px; background-color: #262626; border-radius: 4px;">
                      <div style="margin: 0; color: #d4d4d4; font-size: 15px; line-height: 1.8;">${htmlContent}</div>
                    </div>
                  </td>
                </tr>
                `
                    : ""
                }
                
                <tr>
                  <td style="padding: 20px 40px 40px 40px; text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://leadhero.com"}" style="display: inline-block; padding: 16px 32px; background-color: #59191f; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 600;">
                      Get More Recommendations
                    </a>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #262626;">
                    <p style="margin: 0; color: #737373; font-size: 12px;">
                      You received this email because you requested personalized recommendations from Lead Hero.
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
