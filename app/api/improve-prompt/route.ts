/**
 * API Route для улучшения промпта с помощью AI
 * Использует Vercel AI SDK с текстовой моделью из системных настроек
 */

import { generateText } from "ai"
import { resolveTextModel } from "@/lib/ai/provider"
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
    } catch {
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

    console.log("[improve-prompt] Используется модель:", textModel)

    // Генерируем улучшенный промпт с помощью AI SDK
    const { text: improvedPrompt } = await generateText({
      model: resolveTextModel(textModel),
      system: IMPROVE_SYSTEM_PROMPT,
      prompt,
    })

    if (!improvedPrompt) {
      console.error("[improve-prompt] Пустой ответ от модели")
      return Response.json(
        { error: "Пустой ответ от модели" },
        { status: 500 }
      )
    }

    return Response.json({ improvedPrompt: improvedPrompt.trim() })

  } catch (error: unknown) {
    console.error("[improve-prompt] Ошибка:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Неизвестная ошибка" },
      { status: 500 }
    )
  }
}
