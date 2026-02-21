import { generateImage, generateText } from "ai"
import { openai } from "@/lib/ai/openai"
import { openrouter } from "@/lib/ai/openrouter"

type AiProvider = "openai" | "openrouter"

interface ParseModelStringResult {
  provider: AiProvider
  modelId: string
}

interface GenerateImageFromProviderParams {
  modelString: string
  prompt:
    | string
    | {
        text: string
        images: Array<string | Buffer>
      }
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto"
}

const FALLBACK_PROVIDER: AiProvider = "openai"

export function parseModelString(modelString: string): ParseModelStringResult {
  const normalizedModel = modelString.trim()
  if (!normalizedModel) return { provider: FALLBACK_PROVIDER, modelId: "" }

  const separatorIndex = normalizedModel.indexOf(":")
  if (separatorIndex === -1) {
    return {
      provider: FALLBACK_PROVIDER,
      modelId: normalizedModel,
    }
  }

  const rawProvider = normalizedModel.slice(0, separatorIndex).trim().toLowerCase()
  const modelId = normalizedModel.slice(separatorIndex + 1).trim()
  const provider: AiProvider = rawProvider === "openrouter" ? "openrouter" : FALLBACK_PROVIDER

  return {
    provider,
    modelId,
  }
}

export function resolveTextModel(modelString: string) {
  const { provider, modelId } = parseModelString(modelString)

  if (!modelId)
    throw new Error("Не удалось определить text model: пустое значение в системных настройках")

  if (provider === "openrouter") return openrouter(modelId)
  return openai(modelId)
}

function getAspectRatioFromSize(size?: GenerateImageFromProviderParams["size"]): "1:1" | "2:3" | "3:2" | undefined {
  if (!size || size === "auto") return undefined
  if (size === "1024x1024") return "1:1"
  if (size === "1024x1536") return "2:3"
  if (size === "1536x1024") return "3:2"
  return undefined
}

export async function generateImageFromProvider(params: GenerateImageFromProviderParams) {
  const { modelString, prompt, size } = params
  const { provider, modelId } = parseModelString(modelString)

  if (!modelId)
    throw new Error("Не удалось определить image model: пустое значение в системных настройках")

  if (provider === "openrouter") {
    const aspectRatio = getAspectRatioFromSize(size)

    // Сначала пробуем imageModel (работает для Flux и других моделей)
    try {
      console.log("[generateImageFromProvider] Пробуем imageModel для:", modelId)
      const imageModel = openrouter.imageModel(modelId)
      
      return await generateImage({
        model: imageModel,
        prompt,
        ...(aspectRatio ? { aspectRatio } : {}),
      })
    } catch (imageModelError) {
      const errorMessage = imageModelError instanceof Error ? imageModelError.message : String(imageModelError)
      
      // Если ошибка "No endpoints found", пробуем через generateText с modalities (для Gemini)
      if (errorMessage.includes("No endpoints found") || errorMessage.includes("endpoint")) {
        console.log("[generateImageFromProvider] imageModel не сработал, пробуем generateText с modalities")
        
        try {
          const promptText = typeof prompt === "string" ? prompt : prompt.text
          const promptImages = typeof prompt === "object" && "images" in prompt ? prompt.images : []
          
          // Формируем content для сообщения
          const contentParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = []
          
          if (promptText) {
            contentParts.push({ type: "text", text: promptText })
          }
          
          for (const img of promptImages) {
            if (typeof img === "string") {
              contentParts.push({ type: "image_url", image_url: { url: img } })
            } else if (Buffer.isBuffer(img)) {
              const base64 = img.toString("base64")
              contentParts.push({ type: "image_url", image_url: { url: `data:image/png;base64,${base64}` } })
            }
          }
          
          // Прямой вызов OpenRouter API
          const apiKey = process.env.OPENROUTER_API_KEY
          if (!apiKey) {
            throw new Error("OPENROUTER_API_KEY не настроен в переменных окружения")
          }
          
          const requestBody: any = {
            model: modelId,
            messages: [
              {
                role: "user",
                content: contentParts.length === 1 && contentParts[0].type === "text"
                  ? contentParts[0].text
                  : contentParts,
              },
            ],
            modalities: ["image", "text"],
          }
          
          if (aspectRatio) {
            requestBody.image_config = { aspect_ratio: aspectRatio }
          }
          
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              "X-Title": "Smart Response",
            },
            body: JSON.stringify(requestBody),
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}. ${errorText}`)
          }
          
          const data = await response.json()
          
          // Извлекаем изображения из ответа
          const images: string[] = []
          if (data.choices && data.choices.length > 0) {
            const message = data.choices[0].message
            if (message?.images) {
              for (const img of message.images) {
                if (img.image_url?.url) {
                  images.push(img.image_url.url)
                }
              }
            }
          }
          
          if (images.length === 0) {
            throw new Error("Модель не вернула изображения. Попробуйте другую модель или проверьте API ключ.")
          }
          
          return { images: images.map(img => img.startsWith("data:") ? img : img) }
        } catch (fallbackError) {
          console.error("[generateImageFromProvider] Fallback тоже не сработал:", fallbackError)
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          throw new Error(`Ошибка генерации изображения через OpenRouter (модель: ${modelId}): ${fallbackMessage}. Исходная ошибка: ${errorMessage}`)
        }
      } else {
        // Другая ошибка - пробрасываем как есть
        throw new Error(`Ошибка генерации изображения через OpenRouter (модель: ${modelId}): ${errorMessage}`)
      }
    }
  }

  return generateImage({
    model: openai.image(modelId),
    prompt,
    ...(size ? { size } : {}),
  })
}
