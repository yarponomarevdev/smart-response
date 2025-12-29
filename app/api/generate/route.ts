import { createClient } from "@/lib/supabase/server"
import { getGlobalTextPrompt, getGlobalImagePrompt, getTextModel, getImageModel } from "@/app/actions/system-settings"

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

    const { url, formId, customFields } = body

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

    // Форматируем кастомные поля для включения в промпт
    let customFieldsContext = ""
    if (customFields && typeof customFields === "object" && Object.keys(customFields).length > 0) {
      customFieldsContext = "\n\nAdditional user-provided information:\n"
      for (const [key, value] of Object.entries(customFields)) {
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value)) {
            customFieldsContext += `- ${key}: ${value.join(", ")}\n`
          } else if (typeof value === "boolean") {
            customFieldsContext += `- ${key}: ${value ? "Yes" : "No"}\n`
          } else {
            customFieldsContext += `- ${key}: ${value}\n`
          }
        }
      }
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

    // Определяем формат результата
    const resultFormat = getContent("ai_result_format", "text")

    // Получаем индивидуальный промпт формы (может быть пустым)
    const formPrompt = getContent("ai_system_prompt", "")

    const urlContent = await fetchUrlContent(url)

    if (resultFormat === "image") {
      // Получаем модель для генерации изображений
      const imageModel = await getImageModel()
      
      if (!imageModel) {
        return Response.json(
          {
            error: "Модель для генерации изображений не настроена",
            details: "Выберите модель изображений в системных настройках супер-админа",
          },
          { status: 400, headers: corsHeaders },
        )
      }

      // Получаем глобальный промпт для изображений
      const globalImagePrompt = await getGlobalImagePrompt()

      // Комбинируем глобальный и индивидуальный промпты
      let imageSystemPrompt: string | null = null
      if (globalImagePrompt && formPrompt) {
        imageSystemPrompt = `${globalImagePrompt}\n\n---\n\n${formPrompt}`
      } else if (globalImagePrompt) {
        imageSystemPrompt = globalImagePrompt
      } else if (formPrompt) {
        imageSystemPrompt = formPrompt
      }

      if (!imageSystemPrompt) {
        return Response.json(
          {
            error: "Промпт для изображений не настроен",
            details: "Установите global_image_prompt в системных настройках или ai_system_prompt для формы",
          },
          { status: 400, headers: corsHeaders },
        )
      }

      // Формируем финальный промпт для генерации изображения
      const imagePrompt = `${imageSystemPrompt}\n\nUser preferences from URL content:\n${urlContent.slice(0, 1500)}${customFieldsContext}`

      console.log("[v0] Using image model:", imageModel)
      console.log("[v0] Image prompt preview:", imagePrompt.slice(0, 100) + "...")

      let imageResponse
      try {
        imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: imageModel,
            prompt: imagePrompt,
            n: 1,
            size: "1024x1024",
          }),
        })
      } catch (imageFetchError: any) {
        console.error("[v0] Image generation connection error:", imageFetchError)
        return Response.json(
          {
            error: "Ошибка подключения к API генерации изображений",
            details: imageFetchError.message || "Failed to connect to OpenAI API",
          },
          { status: 502, headers: corsHeaders },
        )
      }

      if (!imageResponse.ok) {
        let errorData
        try {
          errorData = await imageResponse.json()
        } catch {
          errorData = { error: { message: `HTTP ${imageResponse.status}: ${imageResponse.statusText}` } }
        }
        console.error("[v0] Image generation API error:", errorData)

        return Response.json(
          {
            error: "Ошибка генерации изображения",
            details: errorData.error?.message || "Не удалось сгенерировать изображение. Проверьте настройки в админке.",
          },
          { status: imageResponse.status, headers: corsHeaders },
        )
      }

      const imageData = await imageResponse.json()
      const imageUrl = imageData.data[0]?.url || ""

      if (!imageUrl) {
        console.error("[v0] Empty image URL:", imageData)
        return Response.json(
          {
            error: "Пустой ответ от API",
            details: "API не вернул ссылку на изображение. Попробуйте другие настройки промптов.",
          },
          { status: 500, headers: corsHeaders },
        )
      }

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
      // Получаем модель для генерации текста
      const textModel = await getTextModel()
      
      if (!textModel) {
        return Response.json(
          {
            error: "Модель для генерации текста не настроена",
            details: "Выберите модель текста в системных настройках супер-админа",
          },
          { status: 400, headers: corsHeaders },
        )
      }

      // Получаем глобальный промпт для текста
      const globalTextPrompt = await getGlobalTextPrompt()

      // Комбинируем глобальный и индивидуальный промпты
      let textSystemPrompt: string | null = null
      if (globalTextPrompt && formPrompt) {
        textSystemPrompt = `${globalTextPrompt}\n\n---\n\n${formPrompt}`
      } else if (globalTextPrompt) {
        textSystemPrompt = globalTextPrompt
      } else if (formPrompt) {
        textSystemPrompt = formPrompt
      }

      if (!textSystemPrompt) {
        return Response.json(
          {
            error: "Промпт для текста не настроен",
            details: "Установите global_text_prompt в системных настройках или ai_system_prompt для формы",
          },
          { status: 400, headers: corsHeaders },
        )
      }

      console.log("[v0] Using text model:", textModel)

      let response
      try {
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: textModel,
            messages: [
              {
                role: "system",
                content: textSystemPrompt,
              },
              {
                role: "user",
                content: `URL: ${url}\n\nContent:\n${urlContent}${customFieldsContext}\n\nPlease provide your analysis and recommendations.`,
              },
            ],
            max_completion_tokens: 1500,
            temperature: 0.7,
          }),
        })
      } catch (fetchError: any) {
        console.error("[v0] OpenAI connection error:", fetchError)
        return Response.json(
          {
            error: "OpenAI connection failed",
            details: fetchError.message || "Failed to connect to OpenAI API",
          },
          { status: 502, headers: corsHeaders },
        )
      }

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
