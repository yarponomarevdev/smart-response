import { createClient } from "@/lib/supabase/server"
import { getGlobalTextPrompt, getGlobalImagePrompt, getTextModel, getImageModel } from "@/app/actions/system-settings"
import { extractTextFromFile } from "@/lib/file-parser"
import { saveImageToStorage } from "@/lib/utils/image-storage"

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

/**
 * Загружает и извлекает текст из файлов базы знаний
 */
async function getKnowledgeBaseContent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formId: string
): Promise<string> {
  try {
    // Получаем список файлов
    const { data: files, error } = await supabase
      .from("form_knowledge_files")
      .select("*")
      .eq("form_id", formId)
      .order("created_at", { ascending: true })

    if (error || !files || files.length === 0) {
      return ""
    }

    const fileContents: string[] = []
    
    // Ограничиваем общий размер контекста (~30000 символов для файлов)
    const maxTotalLength = 30000
    let totalLength = 0

    for (const file of files) {
      if (totalLength >= maxTotalLength) {
        fileContents.push("\n[Достигнут лимит контекста, остальные файлы пропущены]")
        break
      }

      try {
        // Скачиваем файл из Storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("knowledge-files")
          .download(file.file_path)

        if (downloadError || !fileData) {
          console.error(`[v0] Ошибка загрузки файла ${file.file_name}:`, downloadError)
          continue
        }

        // Извлекаем текст из файла
        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const text = await extractTextFromFile(buffer, file.file_type, file.file_name)

        if (text) {
          // Ограничиваем размер каждого файла
          const maxFileLength = Math.min(10000, maxTotalLength - totalLength)
          const truncatedText = text.length > maxFileLength 
            ? text.slice(0, maxFileLength) + "\n[Файл обрезан из-за ограничений размера]"
            : text

          fileContents.push(`--- Файл: ${file.file_name} ---\n${truncatedText}`)
          totalLength += truncatedText.length
        }
      } catch (fileError) {
        console.error(`[v0] Ошибка обработки файла ${file.file_name}:`, fileError)
      }
    }

    if (fileContents.length === 0) {
      return ""
    }

    return fileContents.join("\n\n")
  } catch (error) {
    console.error("[v0] Ошибка получения базы знаний:", error)
    return ""
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

    // Форматируем кастомные поля для включения в контекст
    let customFieldsContext = ""
    if (customFields && typeof customFields === "object" && Object.keys(customFields).length > 0) {
      customFieldsContext = "\n\n--- Данные пользователя ---\n"
      for (const [key, value] of Object.entries(customFields)) {
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value)) {
            customFieldsContext += `- ${key}: ${value.join(", ")}\n`
          } else if (typeof value === "boolean") {
            customFieldsContext += `- ${key}: ${value ? "Да" : "Нет"}\n`
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

    // Fetch form fields to identify URL fields
    const { data: fieldsData } = await supabase
      .from("form_fields")
      .select("field_key, field_type, field_label")
      .eq("form_id", formId)

    const urlFields = fieldsData?.filter(f => f.field_type === 'url') || []
    
    // Process additional URL fields
    let additionalUrlsContext = ""
    if (customFields && typeof customFields === "object" && urlFields.length > 0) {
      const urlsToFetch: { key: string, label: string, url: string }[] = []

      for (const field of urlFields) {
        // Skip if this field's value is the same as the main URL (already fetched)
        const fieldValue = customFields[field.field_key]
        if (typeof fieldValue === 'string' && fieldValue && fieldValue !== url) {
           // Ensure it's a valid URL string
           if (fieldValue.startsWith('http')) {
             urlsToFetch.push({
               key: field.field_key,
               label: field.field_label,
               url: fieldValue
             })
           }
        }
      }

      if (urlsToFetch.length > 0) {
        const results = await Promise.all(
          urlsToFetch.map(async (item) => {
            const content = await fetchUrlContent(item.url)
            return `--- Контент из поля "${item.label}" (${item.url}) ---\n${content}`
          })
        )
        additionalUrlsContext = "\n" + results.join("\n\n") + "\n"
      }
    }

    const getContent = (key: string, defaultValue: string) => {
      return contentData?.find((c) => c.key === key)?.value || defaultValue
    }

    // Определяем формат результата
    const resultFormat = getContent("ai_result_format", "text")

    // Получаем индивидуальный промпт формы (может быть пустым)
    const formPrompt = getContent("ai_system_prompt", "")

    // Проверяем, включена ли база знаний
    const useKnowledgeBase = getContent("use_knowledge_base", "false") === "true"
    const knowledgeUrl = getContent("knowledge_url", "")

    // Получаем контент из URL пользователя
    const urlContent = await fetchUrlContent(url)

    // Формируем контекст базы знаний
    let knowledgeBaseContext = ""
    
    if (useKnowledgeBase) {
      // Получаем контент из файлов базы знаний
      const filesContent = await getKnowledgeBaseContent(supabase, formId)
      
      // Получаем контент из ссылки базы знаний
      let knowledgeUrlContent = ""
      if (knowledgeUrl && knowledgeUrl.trim()) {
        try {
          knowledgeUrlContent = await fetchUrlContent(knowledgeUrl.trim())
          if (knowledgeUrlContent && !knowledgeUrlContent.startsWith("Error") && !knowledgeUrlContent.startsWith("Unable")) {
            knowledgeUrlContent = `--- Ссылка базы знаний: ${knowledgeUrl} ---\n${knowledgeUrlContent}`
          } else {
            knowledgeUrlContent = ""
          }
        } catch (e) {
          console.error("[v0] Ошибка загрузки ссылки базы знаний:", e)
        }
      }

      // Объединяем контент базы знаний
      const knowledgeParts = [filesContent, knowledgeUrlContent].filter(Boolean)
      if (knowledgeParts.length > 0) {
        knowledgeBaseContext = `\n\n=== БАЗА ЗНАНИЙ ===\n${knowledgeParts.join("\n\n")}\n=== КОНЕЦ БАЗЫ ЗНАНИЙ ===`
      }
    }

    if (resultFormat === "image" || resultFormat === "image_with_text") {
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
      // Для изображений база знаний добавляется как часть промпта (ограничение API)
      const imagePrompt = `${imageSystemPrompt}\n\nUser preferences from URL content:\n${urlContent.slice(0, 1500)}${additionalUrlsContext.slice(0, 1500)}${customFieldsContext}${knowledgeBaseContext.slice(0, 2000)}`

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
      } catch (imageFetchError: unknown) {
        console.error("[v0] Image generation connection error:", imageFetchError)
        return Response.json(
          {
            error: "Ошибка подключения к API генерации изображений",
            details: imageFetchError instanceof Error ? imageFetchError.message : "Failed to connect to OpenAI API",
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
      const tempImageUrl = imageData.data[0]?.url || ""

      if (!tempImageUrl) {
        console.error("[v0] Empty image URL:", imageData)
        return Response.json(
          {
            error: "Пустой ответ от API",
            details: "API не вернул ссылку на изображение. Попробуйте другие настройки промптов.",
          },
          { status: 500, headers: corsHeaders },
        )
      }

      // Сохраняем изображение в Supabase Storage для постоянного хранения
      const leadId = crypto.randomUUID()
      const imageUrl = await saveImageToStorage(tempImageUrl, leadId)
      
      // Если не удалось сохранить, используем временный URL
      const finalImageUrl = imageUrl || tempImageUrl
      
      if (!imageUrl) {
        console.warn("[v0] Failed to save image to storage, using temporary URL")
      }

      // Для формата image_with_text генерируем также текстовое описание
      if (resultFormat === "image_with_text") {
        const textModel = await getTextModel()
        
        if (!textModel) {
          // Если текстовая модель не настроена, возвращаем только изображение
          return Response.json(
            {
              success: true,
              result: {
                type: "image_with_text",
                imageUrl: finalImageUrl,
                text: "Создано на основе ваших предпочтений",
              },
            },
            { headers: corsHeaders },
          )
        }

        // Получаем глобальный промпт для текста
        const globalTextPrompt = await getGlobalTextPrompt()

        // Комбинируем глобальный и индивидуальный промпты для текста
        let textSystemPrompt: string | null = null
        if (globalTextPrompt && formPrompt) {
          textSystemPrompt = `${globalTextPrompt}\n\n---\n\n${formPrompt}`
        } else if (globalTextPrompt) {
          textSystemPrompt = globalTextPrompt
        } else if (formPrompt) {
          textSystemPrompt = formPrompt
        }

        if (textSystemPrompt) {
          // Формируем user message с контекстом для генерации текста
          const userMessage = `URL: ${url}

--- Контент страницы ---
${urlContent}
${additionalUrlsContext}
${customFieldsContext}${knowledgeBaseContext}

Provide a brief explanatory text to accompany the generated image. Keep it concise and relevant.`

          try {
            const textResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
                    content: userMessage,
                  },
                ],
                max_completion_tokens: 4000,
                temperature: 0.7,
              }),
            })

            if (textResponse.ok) {
              const textCompletion = await textResponse.json()
              const generatedText = textCompletion.choices[0]?.message?.content || ""

              if (generatedText) {
                return Response.json(
                  {
                    success: true,
                    result: {
                      type: "image_with_text",
                      imageUrl: finalImageUrl,
                      text: generatedText,
                    },
                  },
                  { headers: corsHeaders },
                )
              }
            }
          } catch (textError) {
            console.error("[v0] Text generation error for image_with_text:", textError)
          }
        }

        // Fallback: возвращаем изображение с дефолтным текстом
        return Response.json(
          {
            success: true,
            result: {
              type: "image_with_text",
              imageUrl: finalImageUrl,
              text: "Создано на основе ваших предпочтений",
            },
          },
          { headers: corsHeaders },
        )
      }

      return Response.json(
        {
          success: true,
          result: {
            type: "image",
            imageUrl: finalImageUrl,
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
      console.log("[v0] Knowledge base enabled:", useKnowledgeBase)

      /**
       * Извлекает текст из ответа OpenAI максимально безопасно.
       * Некоторые модели могут вернуть tool_calls/refusal вместо content.
       * Если finish_reason === 'length' но есть частичный контент — используем его.
       */
      const extractGeneratedText = (completion: any) => {
        const choice = completion?.choices?.[0]
        const message = choice?.message
        const content = message?.content
        const finishReason = choice?.finish_reason

        // Если есть хоть какой-то текст — используем (даже при finish_reason: 'length')
        if (typeof content === "string" && content.trim().length > 0) {
          // Предупреждаем если ответ обрезан, но всё равно возвращаем
          if (finishReason === "length") {
            console.warn("[v0] Response truncated (finish_reason: length), using partial content")
          }
          return { text: content, debug: null, truncated: finishReason === "length" }
        }

        const toolCalls = message?.tool_calls
        const refusal = message?.refusal

        return {
          text: "",
          truncated: false,
          debug: {
            finishReason: finishReason ?? null,
            hasToolCalls: Array.isArray(toolCalls) ? toolCalls.length > 0 : Boolean(toolCalls),
            refusal: typeof refusal === "string" ? refusal : null,
            model: completion?.model ?? null,
            usage: completion?.usage ?? null,
          },
        }
      }

      /**
       * Делает запрос к OpenAI и возвращает JSON completion.
       * Важно: возвращаем развёрнутую ошибку, если OpenAI вернул не-JSON/ошибку.
       */
      const callOpenAiChat = async (params: { systemPrompt: string; userMessage: string }) => {
        const { systemPrompt, userMessage } = params

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
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
              ],
              max_completion_tokens: 8000,
              temperature: 0.7,
            }),
          })
        } catch (fetchError: unknown) {
          console.error("[v0] OpenAI connection error:", fetchError)
          return {
            ok: false as const,
            status: 502,
            payload: {
              error: "OpenAI connection failed",
              details: fetchError instanceof Error ? fetchError.message : "Failed to connect to OpenAI API",
            },
          }
        }

        if (!response.ok) {
          let errorData
          try {
            errorData = await response.json()
          } catch {
            errorData = { error: { message: `HTTP ${response.status}: ${response.statusText}` } }
          }

          console.error("[v0] OpenAI API error:", errorData)
          return {
            ok: false as const,
            status: response.status,
            payload: {
              error: "OpenAI API error",
              details: errorData.error?.message || "Unknown error",
            },
          }
        }

        try {
          const completion = await response.json()
          return { ok: true as const, completion }
        } catch (parseError: unknown) {
          console.error("[v0] OpenAI JSON parse error:", parseError)
          return {
            ok: false as const,
            status: 502,
            payload: {
              error: "Некорректный ответ от OpenAI",
              details: parseError instanceof Error ? parseError.message : "Не удалось распарсить JSON",
            },
          }
        }
      }

      // Формируем user message с контекстом
      const userMessage = `URL: ${url}

--- Контент страницы ---
${urlContent}
${additionalUrlsContext}
${customFieldsContext}${knowledgeBaseContext}

Please provide your analysis and recommendations.`

      const firstAttempt = await callOpenAiChat({ systemPrompt: textSystemPrompt, userMessage })
      if (!firstAttempt.ok) {
        return Response.json(firstAttempt.payload, { status: firstAttempt.status, headers: corsHeaders })
      }

      const extracted1 = extractGeneratedText(firstAttempt.completion)
      let generatedText = extracted1.text

      // Fallback: если модель вернула tool_calls/refusal/пустой content — пробуем “дожать” текстом.
      if (!generatedText) {
        console.error("[v0] Empty/non-text response from OpenAI (attempt 1):", {
          debug: extracted1.debug,
          completionPreview: {
            id: firstAttempt.completion?.id,
            model: firstAttempt.completion?.model,
            choices0: firstAttempt.completion?.choices?.[0],
          },
        })

        const fallbackUserMessage = `${userMessage}\n\nВАЖНО: Ответь строго обычным текстом. Не используй инструменты, вызовы функций или JSON.`
        const secondAttempt = await callOpenAiChat({ systemPrompt: textSystemPrompt, userMessage: fallbackUserMessage })
        if (!secondAttempt.ok) {
          return Response.json(
            {
              ...secondAttempt.payload,
              debug: extracted1.debug,
            },
            { status: secondAttempt.status, headers: corsHeaders },
          )
        }

        const extracted2 = extractGeneratedText(secondAttempt.completion)
        generatedText = extracted2.text

        if (!generatedText) {
          console.error("[v0] Empty/non-text response from OpenAI (attempt 2):", {
            debug: extracted2.debug,
            completionPreview: {
              id: secondAttempt.completion?.id,
              model: secondAttempt.completion?.model,
              choices0: secondAttempt.completion?.choices?.[0],
            },
          })

          return Response.json(
            {
              error: "Пустой ответ от модели",
              details: "No content generated",
              debug: {
                attempt1: extracted1.debug,
                attempt2: extracted2.debug,
              },
            },
            { status: 500, headers: corsHeaders },
          )
        }
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
  } catch (error: unknown) {
    console.error("[v0] Generation error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : undefined)
    return Response.json(
      {
        error: "Failed to generate result",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    )
  }
}
