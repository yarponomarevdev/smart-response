import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

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

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LeadHeroBot/1.0)",
      },
    })

    if (!response.ok) {
      return `Unable to fetch URL content (Status: ${response.status})`
    }

    const html = await response.text()

    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000)

    return textContent || "Unable to extract meaningful content from URL"
  } catch (error) {
    console.error("[v0] Error fetching URL:", error)
    return `Error fetching URL: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

export async function POST(req: Request) {
  try {
    // Валидация входных данных
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      console.error("[v0] JSON parse error:", parseError)
      return Response.json(
        {
          error: "Invalid JSON in request body",
          details: parseError instanceof Error ? parseError.message : "Unknown parsing error",
        },
        { status: 400, headers: corsHeaders },
      )
    }

    const { url, formId } = body

    if (!url || !formId) {
      console.error("[v0] Missing required fields:", { url: !!url, formId: !!formId })
      return Response.json(
        {
          error: "Missing required fields",
          details: "Both 'url' and 'formId' are required",
        },
        { status: 400, headers: corsHeaders },
      )
    }

    // Проверка наличия API ключа OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error("[v0] OPENAI_API_KEY is not set")
      return Response.json(
        {
          error: "Server configuration error",
          details: "OpenAI API key is not configured",
        },
        { status: 500, headers: corsHeaders },
      )
    }

    const supabase = await createClient()

    // Fetch ALL content settings from form_content
    const { data: contentData, error: contentError } = await supabase
      .from("form_content")
      .select("key, value")
      .eq("form_id", formId)

    if (contentError) {
      console.error("[v0] Supabase query error:", contentError)
      return Response.json(
        {
          error: "Database error",
          details: contentError.message || "Failed to fetch form content",
        },
        { status: 500, headers: corsHeaders },
      )
    }

    const getContent = (key: string, defaultValue: string) => {
      return contentData?.find((c) => c.key === key)?.value || defaultValue
    }

    const systemPrompt = getContent(
      "ai_system_prompt",
      `You are an expert consultant. Analyze the provided content and give personalized, actionable recommendations.

IMPORTANT FORMATTING RULES:
- Write in plain text only, NO markdown formatting
- Do NOT use asterisks, hashtags, or any special characters for emphasis
- Use simple paragraphs separated by blank lines
- Keep your response clean, readable, and professional`,
    )

    const resultFormat = getContent("ai_result_format", "text")

    const urlContent = await fetchUrlContent(url)

    if (resultFormat === "image") {
      const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: systemPrompt, // Use the prompt from admin panel
          n: 1,
          size: "1024x1024",
          quality: "standard",
        }),
      })

      if (!imageResponse.ok) {
        let errorData
        try {
          errorData = await imageResponse.json()
        } catch {
          errorData = { error: { message: `HTTP ${imageResponse.status}: ${imageResponse.statusText}` } }
        }
        console.error("[v0] DALL-E API error:", errorData)
        return Response.json(
          {
            error: "DALL-E API error",
            details: errorData.error?.message || "Unknown error",
          },
          { status: imageResponse.status, headers: corsHeaders },
        )
      }

      const imageData = await imageResponse.json()
      const imageUrl = imageData.data[0]?.url || ""

      return Response.json(
        {
          success: true,
          result: {
            type: "image",
            imageUrl: imageUrl,
            text: `Generated based on: ${url}`,
          },
        },
        { headers: corsHeaders },
      )
    } else {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `URL: ${url}\n\nContent:\n${urlContent}\n\nPlease provide your analysis and recommendations.`,
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: { message: `HTTP ${response.status}: ${response.statusText}` } }
        }
        console.error("[v0] OpenAI API error:", errorData)
        return Response.json(
          {
            error: "OpenAI API error",
            details: errorData.error?.message || "Unknown error",
          },
          { status: response.status, headers: corsHeaders },
        )
      }

      const completion = await response.json()
      const generatedText = completion.choices[0]?.message?.content || ""

      if (!generatedText) {
        console.error("[v0] Empty response from OpenAI:", completion)
        return Response.json(
          {
            error: "Empty response from OpenAI",
            details: "No content generated",
          },
          { status: 500, headers: corsHeaders },
        )
      }

      return Response.json(
        {
          success: true,
          result: {
            type: "text",
            text: generatedText,
          },
        },
        { headers: corsHeaders },
      )
    }
  } catch (error: any) {
    console.error("[v0] Generation error:", error)
    console.error("[v0] Error stack:", error?.stack)
    return Response.json(
      {
        error: "Failed to generate result",
        details: error?.message || "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    )
  }
}
