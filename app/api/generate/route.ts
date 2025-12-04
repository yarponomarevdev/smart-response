import { createClient } from "@/lib/supabase/server"
import { getGlobalSystemPrompt } from "@/app/actions/system-settings"

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

    // Получаем глобальный системный промпт
    const globalPrompt = await getGlobalSystemPrompt()

    // Получаем промпт формы
    const formPrompt = getContent(
      "ai_system_prompt",
      `You are an expert consultant. Analyze the provided content and give personalized, actionable recommendations.

FORMATTING GUIDELINES:
- Use markdown formatting for better readability
- Use **bold** for emphasis on important points
- Use ## for section headings (h2)
- Use ### for subsections (h3)
- Use - or * for bullet lists
- Use numbered lists (1. 2. 3.) for ordered recommendations
- Keep paragraphs separated by blank lines
- Use clear, professional language
- Structure your response with clear sections and subsections

Example format:
## Section Title
**Key point:** Detailed explanation here.

### Subsection
- First recommendation
- Second recommendation

## Another Section
More content here.`,
    )

    // Комбинируем глобальный и формовый промпты
    const systemPrompt = globalPrompt 
      ? `${globalPrompt}\n\n---\n\n${formPrompt}`
      : formPrompt

    const resultFormat = getContent("ai_result_format", "text")

    const urlContent = await fetchUrlContent(url)

    if (resultFormat === "image") {
      // Получаем отдельный промпт для генерации изображений (если задан)
      const imagePromptTemplate = getContent(
        "ai_image_prompt",
        `Create a professional, high-quality interior design visualization. 
Style: Modern, elegant, photorealistic.
The image should be suitable for a professional design presentation.
Based on the following preferences: {context}`
      )

      // Сначала используем GPT для создания безопасного промпта для DALL-E
      // на основе контента URL и шаблона
      let dallePrompt: string
      
      try {
        const promptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are an expert at creating DALL-E image prompts for interior design visualization.
Your task is to create a SAFE, APPROPRIATE prompt for DALL-E based on user preferences.

CRITICAL RULES:
- Output ONLY the prompt text, nothing else
- The prompt must be in English
- Keep it under 900 characters
- Focus on: room type, style, colors, furniture, lighting, atmosphere
- NEVER include: people, faces, text, brand names, copyrighted content
- Make it professional and suitable for interior design presentation
- If user content seems inappropriate, create a generic modern interior prompt instead`,
              },
              {
                role: "user",
                content: `User template: ${imagePromptTemplate}

User preferences from URL content:
${urlContent.slice(0, 1500)}

Create a DALL-E prompt for interior design visualization:`,
              },
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
        })

        if (!promptResponse.ok) {
          console.error("[v0] GPT prompt generation failed, using default prompt")
          dallePrompt = "A beautiful modern living room interior with natural lighting, elegant furniture, neutral color palette, professional interior design visualization, photorealistic, 8k quality"
        } else {
          const promptData = await promptResponse.json()
          dallePrompt = promptData.choices[0]?.message?.content?.trim() || 
            "A beautiful modern interior design visualization, professional, photorealistic, elegant furniture and decor"
        }
      } catch (promptError) {
        console.error("[v0] Error generating DALL-E prompt:", promptError)
        dallePrompt = "A beautiful modern living room interior with natural lighting, elegant furniture, neutral color palette, professional interior design visualization, photorealistic"
      }

      console.log("[v0] Generated DALL-E prompt:", dallePrompt.slice(0, 100) + "...")

      const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: dallePrompt,
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
        
        // Если DALL-E отклонил запрос, пробуем с дефолтным безопасным промптом
        if (imageResponse.status === 400) {
          console.log("[v0] Retrying with safe default prompt...")
          const retryResponse = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "dall-e-3",
              prompt: "A beautiful modern living room interior with natural lighting, elegant furniture, soft neutral color palette, professional interior design visualization, photorealistic rendering, high quality architectural photography style",
              n: 1,
              size: "1024x1024",
              quality: "standard",
            }),
          })

          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            const retryImageUrl = retryData.data[0]?.url || ""
            return Response.json(
              {
                success: true,
                result: {
                  type: "image",
                  imageUrl: retryImageUrl,
                  text: `Создано на основе ваших предпочтений`,
                },
              },
              { headers: corsHeaders },
            )
          }
        }
        
        return Response.json(
          {
            error: "Ошибка генерации изображения",
            details: "Не удалось сгенерировать изображение. Попробуйте ещё раз или измените ссылку.",
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
            text: `Создано на основе ваших предпочтений`,
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
