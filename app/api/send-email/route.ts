import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, score, url } = await request.json()

    if (!email || !score) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // In a production app, integrate with an email service like:
    // - Resend (recommended for Next.js)
    // - SendGrid
    // - Mailgun
    // - AWS SES

    // For now, we'll log the email that would be sent
    const emailContent = {
      to: email,
      subject: "Your Lead Score Results",
      html: generateEmailHTML(score, url),
    }

    console.log("[v0] Email would be sent:", emailContent)

    // TODO: Integrate with email service
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'noreply@yourdomain.com',
    //   to: email,
    //   subject: 'Your Lead Score Results',
    //   html: generateEmailHTML(score, url),
    // });

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error sending email:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}

function generateEmailHTML(score: number, url: string) {
  const scoreColor = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444"
  const scoreLabel = score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Improvement"

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Lead Score Results</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #171717; border-radius: 8px; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ffffff;">Your Lead Score Results</h1>
                  </td>
                </tr>
                
                <!-- Score Circle -->
                <tr>
                  <td style="padding: 20px 40px; text-align: center;">
                    <div style="display: inline-block; position: relative; width: 200px; height: 200px; background-color: #262626; border-radius: 50%; padding: 20px;">
                      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                        <div style="font-size: 64px; font-weight: bold; color: ${scoreColor}; line-height: 1;">${score}</div>
                        <div style="font-size: 16px; color: #a3a3a3; margin-top: 8px;">${scoreLabel}</div>
                      </div>
                    </div>
                  </td>
                </tr>
                
                <!-- URL -->
                ${
                  url
                    ? `
                <tr>
                  <td style="padding: 20px 40px; text-align: center;">
                    <p style="margin: 0; color: #a3a3a3; font-size: 14px;">Website analyzed:</p>
                    <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 16px; font-weight: 500;">${url}</p>
                  </td>
                </tr>
                `
                    : ""
                }
                
                <!-- Insights Section -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; color: #ffffff;">Detailed Insights</h2>
                    
                    <div style="margin-bottom: 20px; padding: 20px; background-color: #262626; border-radius: 4px;">
                      <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">Performance Analysis</h3>
                      <p style="margin: 0; color: #a3a3a3; font-size: 14px; line-height: 1.6;">
                        Your website scored ${score} out of 100. This score is based on multiple factors including user experience, content quality, and technical optimization.
                      </p>
                    </div>
                    
                    <div style="margin-bottom: 20px; padding: 20px; background-color: #262626; border-radius: 4px;">
                      <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">Key Recommendations</h3>
                      <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #a3a3a3; font-size: 14px; line-height: 1.8;">
                        <li>Optimize page load speed for better user experience</li>
                        <li>Enhance mobile responsiveness across all devices</li>
                        <li>Improve content structure and SEO optimization</li>
                        <li>Add clear calls-to-action to increase conversions</li>
                      </ul>
                    </div>
                    
                    <div style="margin-bottom: 20px; padding: 20px; background-color: #262626; border-radius: 4px;">
                      <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff;">Next Steps</h3>
                      <p style="margin: 0; color: #a3a3a3; font-size: 14px; line-height: 1.6;">
                        Focus on implementing the recommendations above to improve your lead score. Regular monitoring and optimization will help you achieve better results.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- CTA Button -->
                <tr>
                  <td style="padding: 20px 40px 40px 40px; text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com"}" style="display: inline-block; padding: 16px 32px; background-color: #59191f; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 600;">
                      Analyze Another Website
                    </a>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #262626;">
                    <p style="margin: 0; color: #737373; font-size: 12px;">
                      You received this email because you requested a lead score analysis.
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
