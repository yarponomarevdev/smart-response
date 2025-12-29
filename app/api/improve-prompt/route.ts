/**
 * API Route для улучшения промпта с помощью AI
 * Использует текстовую модель из системных настроек
 */

import { getTextModel } from "@/app/actions/system-settings"

export const maxDuration = 60

const IMPROVE_SYSTEM_PROMPT = `Ты — эксперт по созданию промптов для AI-ассистентов.
Улучши данный промпт, сделав его:
- Более чётким и структурированным
- С ясными инструкциями для AI
- С указанием желаемого формата ответа
- Профессиональным и эффективным
- Без Markdown-форматирования

Верни ТОЛЬКО улучшенный промпт без пояснений и комментариев.`

export async function POST(req: Request) {
  try {
    // Парсим тело запроса
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      return Response.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    const { prompt } = body

    if (!prompt || typeof prompt !== "string") {
      return Response.json(
        { error: "Поле 'prompt' обязательно и должно быть строкой" },
        { status: 400 }
      )
    }

    // Проверяем API ключ
    if (!process.env.OPENAI_API_KEY) {
      console.error("[improve-prompt] OPENAI_API_KEY is not set")
      return Response.json(
        { error: "OpenAI API key не настроен" },
        { status: 500 }
      )
    }

    // Получаем модель из системных настроек
    const textModel = await getTextModel()

    if (!textModel) {
      return Response.json(
        { 
          error: "Модель для генерации текста не настроена",
          details: "Выберите модель текста в системных настройках супер-админа"
        },
        { status: 400 }
      )
    }

    console.log("[improve-prompt] Using model:", textModel)

    // Отправляем запрос в OpenAI
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
              content: IMPROVE_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_completion_tokens: 2000,
          temperature: 0.7,
        }),
      })
    } catch (fetchError: any) {
      console.error("[improve-prompt] OpenAI connection error:", fetchError)
      return Response.json(
        { error: "Ошибка подключения к OpenAI" },
        { status: 502 }
      )
    }

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { error: { message: `HTTP ${response.status}` } }
      }
      console.error("[improve-prompt] OpenAI API error:", errorData)
      return Response.json(
        { error: errorData.error?.message || "Ошибка OpenAI API" },
        { status: response.status }
      )
    }

    const completion = await response.json()
    const improvedPrompt = completion.choices[0]?.message?.content?.trim() || ""

    if (!improvedPrompt) {
      console.error("[improve-prompt] Empty response from OpenAI:", completion)
      return Response.json(
        { error: "Пустой ответ от OpenAI" },
        { status: 500 }
      )
    }

    return Response.json({ improvedPrompt })

  } catch (error: any) {
    console.error("[improve-prompt] Error:", error)
    return Response.json(
      { error: error?.message || "Неизвестная ошибка" },
      { status: 500 }
    )
  }
}
