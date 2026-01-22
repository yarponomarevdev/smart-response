import { createClient } from "@/lib/supabase/server"
import { getGlobalTextPrompt, getGlobalImagePrompt, getTextModel, getImageModel } from "@/app/actions/system-settings"
import { extractTextFromFile } from "@/lib/file-parser"
import { saveBase64ImageToStorage, saveImageToStorage } from "@/lib/utils/image-storage"

export const maxDuration = 300

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

function normalizeUrl(value: string): string | null {
  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  const urlCandidate = trimmedValue.startsWith("http") ? trimmedValue : `https://${trimmedValue}`
  try {
    return new URL(urlCandidate).toString()
  } catch {
    return null
  }
}

interface LimitTextByCharsParams {
  value: string
  maxLength: number
}

interface BuildFallbackImagePromptParams {
  imageSystemPrompt: string
  context: string
  maxLength: number
}

function buildJinaReaderUrl(url: string) {
  const normalized = url.replace(/^https?:\/\//, "")
  return `https://r.jina.ai/http://${normalized}`
}

function isFetchErrorContent(content: string) {
  return content.startsWith("Не удалось") || content.startsWith("Ошибка")
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

function limitTextByChars(params: LimitTextByCharsParams) {
  const { value, maxLength } = params

  if (value.length <= maxLength) {
    return { text: value, wasTruncated: false }
  }

  return {
    text: value.slice(0, maxLength),
    wasTruncated: true,
  }
}

function buildFallbackImagePrompt(params: BuildFallbackImagePromptParams) {
  const { imageSystemPrompt, context, maxLength } = params
  const contextLimit = Math.min(2000, maxLength)
  const { text: clippedContext } = limitTextByChars({ value: context, maxLength: contextLimit })
  const basePrompt = `${imageSystemPrompt}\n\nWebsite description:\n${clippedContext}`
  const { text: finalPrompt } = limitTextByChars({ value: basePrompt, maxLength })

  return finalPrompt
}

async function fetchUrlContent(url: string): Promise<string> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (compatible; LeadHeroBot/1.0)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru,en;q=0.9",
  }

  const extractText = (html: string) => {
    // Безлимит на входящие токены - возвращаем весь текст без обрезки
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  try {
    const response = await fetchWithTimeout(url, { headers }, 12000)

    if (!response.ok) {
      // Если сайт режет прямой доступ — пробуем через Reader-прокси
      if (response.status === 403 || response.status === 429) {
        const proxyUrl = buildJinaReaderUrl(url)
        const proxyResponse = await fetchWithTimeout(proxyUrl, { headers }, 12000)
        if (proxyResponse.ok) {
          const proxyHtml = await proxyResponse.text()
          const proxyText = extractText(proxyHtml)
          return proxyText || "Не удалось извлечь содержательный текст по ссылке"
        }
      }

      return `Не удалось получить контент по ссылке (HTTP ${response.status})`
    }

    const html = await response.text()
    const textContent = extractText(html)

    return textContent || "Не удалось извлечь содержательный текст по ссылке"
  } catch (error) {
    console.error("Ошибка получения URL:", error)
    return `Ошибка при загрузке ссылки: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
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

    // Безлимит на размер контекста - загружаем все файлы полностью
    for (const file of files) {
      try {
        // Скачиваем файл из Storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("knowledge-files")
          .download(file.file_path)

        if (downloadError || !fileData) {
          console.error(`Ошибка загрузки файла ${file.file_name}:`, downloadError)
          continue
        }

        // Извлекаем текст из файла
        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const text = await extractTextFromFile(buffer, file.file_type, file.file_name)

        if (text) {
          // Не обрезаем файлы - используем полный текст
          fileContents.push(`--- Файл: ${file.file_name} ---\n${text}`)
        }
      } catch (fileError) {
        console.error(`Ошибка обработки файла ${file.file_name}:`, fileError)
      }
    }

    if (fileContents.length === 0) {
      return ""
    }

    return fileContents.join("\n\n")
  } catch (error) {
    console.error("Ошибка получения базы знаний:", error)
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
      console.error("Ошибка парсинга JSON:", parseError)
      return Response.json(
        {
          error: "Invalid JSON in request body",
          details: parseError instanceof Error ? parseError.message : "Unknown parsing error",
        },
        { status: 400, headers: corsHeaders },
      )
    }

    const { url, formId, customFields } = body

    if (!formId) {
      console.error("Отсутствует обязательное поле formId")
      return Response.json(
        {
          error: "Missing required field",
          details: "'formId' is required",
        },
        { status: 400, headers: corsHeaders },
      )
    }

    // URL опционален: если передан, валидируем и нормализуем
    let normalizedMainUrl: string | null = null
    if (url) {
      normalizedMainUrl = normalizeUrl(String(url))
      if (!normalizedMainUrl) {
        return Response.json(
          {
            error: "Некорректная ссылка",
            details: "Не удалось распознать URL",
          },
          { status: 400, headers: corsHeaders },
        )
      }
    }

    // Проверка наличия API ключа OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY не установлен")
      return Response.json(
        {
          error: "Server configuration error",
          details: "OpenAI API key is not configured",
        },
        { status: 500, headers: corsHeaders },
      )
    }

    const supabase = await createClient()

    // Fetch form settings directly from forms table
    const { data: formData, error: formError } = await supabase
      .from("forms")
      .select("*")
      .eq("id", formId)
      .single()

    if (formError || !formData) {
      console.error("Ошибка запроса Supabase:", formError)
      return Response.json(
        {
          error: "Database error",
          details: formError?.message || "Failed to fetch form",
        },
        { status: 500, headers: corsHeaders },
      )
    }

    // Fetch form fields to identify URL and image fields
    const { data: fieldsData } = await supabase
      .from("form_fields")
      .select("field_key, field_type, field_label")
      .eq("form_id", formId)

    const urlFields = fieldsData?.filter(f => f.field_type === 'url') || []
    const imageFields = fieldsData?.filter(f => f.field_type === 'image') || []

    // Форматируем кастомные поля для включения в контекст
    // Извлекаем image поля отдельно - они не должны попадать в текстовый контекст
    const imageFieldKeys = new Set(imageFields.map(f => f.field_key))
    let inputImages: Record<string, string> = {}
    let customFieldsContext = ""
    
    if (customFields && typeof customFields === "object" && Object.keys(customFields).length > 0) {
      customFieldsContext = "\n\n--- Данные пользователя ---\n"
      for (const [key, value] of Object.entries(customFields)) {
        if (value !== undefined && value !== null && value !== "") {
          // Исключаем image поля из текстового контекста
          if (imageFieldKeys.has(key)) {
            // Сохраняем base64 изображения отдельно
            if (typeof value === "string" && value.startsWith("data:image/")) {
              inputImages[key] = value
            }
          } else if (Array.isArray(value)) {
            customFieldsContext += `- ${key}: ${value.join(", ")}\n`
          } else if (typeof value === "boolean") {
            customFieldsContext += `- ${key}: ${value ? "Да" : "Нет"}\n`
          } else {
            customFieldsContext += `- ${key}: ${value}\n`
          }
        }
      }
    }
    
    // Process additional URL fields
    let additionalUrlsContext = ""
    if (customFields && typeof customFields === "object" && urlFields.length > 0) {
      const urlsToFetch: { key: string, label: string, url: string }[] = []

      for (const field of urlFields) {
        // Skip if this field's value is the same as the main URL (already fetched)
        const fieldValue = customFields[field.field_key]
        if (typeof fieldValue === "string" && fieldValue.trim()) {
          const normalizedFieldUrl = normalizeUrl(fieldValue)
          if (normalizedFieldUrl && normalizedFieldUrl !== normalizedMainUrl) {
            urlsToFetch.push({
              key: field.field_key,
              label: field.field_label,
              url: normalizedFieldUrl,
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

    // Определяем формат результата (теперь напрямую из formData)
    const resultFormat = formData.ai_result_format || "text"

    // Получаем индивидуальный промпт формы (может быть пустым)
    const formPrompt = formData.ai_system_prompt || ""

    // Проверяем, включена ли база знаний
    const useKnowledgeBase = formData.use_knowledge_base === true
    const knowledgeUrl = formData.knowledge_url || ""

    // Получаем контент из URL пользователя (если URL передан)
    const urlContent = normalizedMainUrl ? await fetchUrlContent(normalizedMainUrl) : ""

    // Формируем контекст базы знаний
    let knowledgeBaseContext = ""
    
    if (useKnowledgeBase) {
      // Получаем контент из файлов базы знаний
      const filesContent = await getKnowledgeBaseContent(supabase, formId)
      
      // Получаем контент из ссылки базы знаний
      let knowledgeUrlContent = ""
      if (knowledgeUrl && knowledgeUrl.trim()) {
        try {
          const normalizedKnowledgeUrl = normalizeUrl(knowledgeUrl.trim())
          if (normalizedKnowledgeUrl) {
            knowledgeUrlContent = await fetchUrlContent(normalizedKnowledgeUrl)
          }
          if (knowledgeUrlContent && !isFetchErrorContent(knowledgeUrlContent)) {
            knowledgeUrlContent = `--- Ссылка базы знаний: ${knowledgeUrl} ---\n${knowledgeUrlContent}`
          } else {
            knowledgeUrlContent = ""
          }
        } catch (e) {
          console.error("Ошибка загрузки ссылки базы знаний:", e)
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

      // Получаем текстовую модель для создания промпта
      const textModel = await getTextModel()
      
      if (!textModel) {
        return Response.json(
          {
            error: "Модель для генерации текста не настроена (требуется для создания промпта изображения)",
            details: "Выберите модель текста в системных настройках супер-админа",
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

      // DALL-E имеет лимит 4000 символов для промпта
      // Используем GPT для создания короткого промпта на основе всего контекста
      const maxContextChars = 12000
      const maxDallePromptChars = 3500
      const metaContext = `${customFieldsContext}${additionalUrlsContext}${knowledgeBaseContext}`.trim()
      const fullContext = `${normalizedMainUrl ? `URL: ${normalizedMainUrl}\n\n` : ""}${metaContext ? `${metaContext}\n\n` : ""}${urlContent ? `--- Контент страницы ---\n${urlContent}` : ""}`.trim()
      const { text: limitedContext, wasTruncated: wasContextTruncated } = limitTextByChars({
        value: fullContext,
        maxLength: maxContextChars,
      })

      console.log("Используется модель изображений:", imageModel)
      console.log("Используется текстовая модель для создания промпта:", textModel)
      console.log("Размер полного контекста:", fullContext.length, "символов")
      if (wasContextTruncated) {
        console.log("Контекст обрезан до", maxContextChars, "символов")
      }

      // Определяем режим генерации для формирования промпта
      const hasInputImage = Object.keys(inputImages).length > 0
      const useEditAPI = hasInputImage

      // Создаем короткий промпт через GPT
      let compressedPrompt = ""
      let promptSource: "gpt" | "fallback" = "gpt"
      try {
        // Инструкции для промпта зависят от режима
        const promptInstructions = useEditAPI
          ? `ВАЖНО: На основе предоставленного контекста создай короткий и точный промпт для редактирования изображения (максимум 3500 символов). Пользователь загрузил своё изображение, и нужно описать, ЧТО ИЗМЕНИТЬ или ДОБАВИТЬ к нему. Промпт должен быть на английском языке и описывать конкретные изменения. Например: "Add a red hat to the person", "Change background to blue sky", "Add sunglasses to the face". Фокусируйся на действиях редактирования, а не на описании всей сцены.`
          : `ВАЖНО: На основе предоставленного контекста создай короткий и точный промпт для DALL-E (максимум 3500 символов). Промпт должен быть на английском языке и описывать конкретные визуальные детали, которые нужно сгенерировать. Фокусируйся на ключевых визуальных элементах, цветах, стиле, настроении. Избегай излишних деталей, но сохрани суть.`

        const promptCreationResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
                content: `${imageSystemPrompt}

${promptInstructions}`,
              },
              {
                role: "user",
                content: limitedContext,
              },
            ],
            max_completion_tokens: 1000, // Ограничиваем выход, чтобы промпт точно уместился в 3500 символов
          }),
        })

        if (!promptCreationResponse.ok) {
          let errorData: unknown = null
          try {
            errorData = await promptCreationResponse.json()
          } catch {
            errorData = { error: { message: `HTTP ${promptCreationResponse.status}: ${promptCreationResponse.statusText}` } }
          }
          console.error("Ошибка создания промпта через GPT:", errorData)
          promptSource = "fallback"
          compressedPrompt = buildFallbackImagePrompt({
            imageSystemPrompt,
            context: limitedContext,
            maxLength: maxDallePromptChars,
          })
        } else {
          try {
            const promptData = await promptCreationResponse.json()
            compressedPrompt = promptData.choices?.[0]?.message?.content || ""
          } catch (parseError) {
            console.error("Ошибка парсинга промпта от GPT:", parseError)
            promptSource = "fallback"
            compressedPrompt = buildFallbackImagePrompt({
              imageSystemPrompt,
              context: limitedContext,
              maxLength: maxDallePromptChars,
            })
          }
        }

      } catch (promptError: unknown) {
        console.error("Ошибка создания промпта:", promptError)
        promptSource = "fallback"
        compressedPrompt = buildFallbackImagePrompt({
          imageSystemPrompt,
          context: limitedContext,
          maxLength: maxDallePromptChars,
        })
      }

      if (!compressedPrompt) {
        promptSource = "fallback"
        compressedPrompt = buildFallbackImagePrompt({
          imageSystemPrompt,
          context: limitedContext,
          maxLength: maxDallePromptChars,
        })
      }

      const { text: finalPrompt, wasTruncated: wasPromptTruncated } = limitTextByChars({
        value: compressedPrompt,
        maxLength: maxDallePromptChars,
      })
      compressedPrompt = finalPrompt

      console.log("Источник промпта изображения:", promptSource)
      console.log("Размер сжатого промпта:", compressedPrompt.length, "символов")
      if (wasPromptTruncated) {
        console.log("Промпт обрезан до", maxDallePromptChars, "символов")
      }
      console.log("Превью промпта изображения:", compressedPrompt.slice(0, 200) + "...")

      // Теперь генерируем изображение с коротким промптом
      let imageResponse
      try {
        if (useEditAPI) {
          // Используем Images Edit API для редактирования входного изображения
          console.log("Использование Images Edit API с входным изображением")
          
          // Берём первое доступное изображение
          const firstImageKey = Object.keys(inputImages)[0]
          const base64Image = inputImages[firstImageKey]
          
          // Извлекаем base64 данные (убираем префикс data:image/png;base64,)
          const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "")
          const imageBuffer = Buffer.from(base64Data, "base64")
          
          // Создаём FormData для отправки (используем глобальный FormData из Node.js 18+)
          const formData = new FormData()
          
          // Создаём Blob из буфера и добавляем как файл
          const blob = new Blob([imageBuffer], { type: "image/png" })
          formData.append("model", imageModel)
          formData.append("image", blob, "input.png")
          formData.append("prompt", compressedPrompt)
          formData.append("n", "1")
          formData.append("size", "1024x1024")
          
          imageResponse = await fetch("https://api.openai.com/v1/images/edits", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: formData,
          })
        } else {
          // Используем стандартный Images Generations API
          imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: imageModel,
              prompt: compressedPrompt,
              n: 1,
              size: "1024x1024",
            }),
          })
        }
      } catch (imageFetchError: unknown) {
        console.error("Ошибка подключения к API генерации изображений:", imageFetchError)
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
        console.error("Ошибка API генерации изображений:", errorData)

        return Response.json(
          {
            error: "Ошибка генерации изображения",
            details: errorData.error?.message || "Не удалось сгенерировать изображение. Проверьте настройки в админке.",
          },
          { status: imageResponse.status, headers: corsHeaders },
        )
      }

      const imageData = await imageResponse.json()
      const imageItem = imageData.data?.[0]
      const tempImageUrl = imageItem?.url || ""
      const tempImageBase64 = imageItem?.b64_json || ""

      if (!tempImageUrl && !tempImageBase64) {
        console.error("Пустой ответ изображения:", imageData)
        return Response.json(
          {
            error: "Пустой ответ от API",
            details: "API не вернуло URL или base64. Попробуйте другие настройки промптов.",
          },
          { status: 500, headers: corsHeaders },
        )
      }

      // Сохраняем изображение в Supabase Storage для постоянного хранения
      const leadId = crypto.randomUUID()
      let imageUrl: string | null = null

      if (tempImageBase64) {
        imageUrl = await saveBase64ImageToStorage({
          base64: tempImageBase64,
          leadId,
        })
      } else {
        imageUrl = await saveImageToStorage(tempImageUrl, leadId)
      }

      const finalImageUrl =
        imageUrl ||
        tempImageUrl ||
        (tempImageBase64 ? `data:image/png;base64,${tempImageBase64}` : "")

      if (!imageUrl) {
        console.warn("Не удалось сохранить изображение в хранилище, используется временный ответ")
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
          const userMessage = `${normalizedMainUrl ? `URL: ${normalizedMainUrl}\n\n` : ""}${urlContent ? `--- Контент страницы ---\n${urlContent}\n` : ""}${additionalUrlsContext}${customFieldsContext}${knowledgeBaseContext}

Provide a brief explanatory text to accompany the generated image. Keep it concise and relevant.`

          try {
            const requestBody = {
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
              // Безлимит на токены выхода - используем максимум модели
            }

            const textResponse = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify(requestBody),
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
            console.error("Ошибка генерации текста для image_with_text:", textError)
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

      console.log("Используется текстовая модель:", textModel)
      console.log("База знаний включена:", useKnowledgeBase)

      // Извлекаем текст из ответа OpenAI
      const extractGeneratedText = (completion: any) => {
        return completion?.choices?.[0]?.message?.content || ""
      }

      /**
       * Делает запрос к OpenAI и возвращает JSON completion.
       */
      const callOpenAiChat = async (params: { systemPrompt: string; userMessage: string }) => {
        const { systemPrompt, userMessage } = params

        const requestBody = {
          model: textModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          // Безлимит на токены выхода - используем максимум модели
        }

        let response
        try {
          response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify(requestBody),
          })
        } catch (fetchError: unknown) {
          console.error("Ошибка подключения к OpenAI:", fetchError)
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

          console.error("Ошибка API OpenAI:", errorData)
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
          console.error("Ошибка парсинга JSON от OpenAI:", parseError)
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
      const userMessage = `${normalizedMainUrl ? `URL: ${normalizedMainUrl}\n\n` : ""}${urlContent ? `--- Контент страницы ---\n${urlContent}\n` : ""}${additionalUrlsContext}${customFieldsContext}${knowledgeBaseContext}

Please provide your analysis and recommendations.`

      const firstAttempt = await callOpenAiChat({ systemPrompt: textSystemPrompt, userMessage })
      if (!firstAttempt.ok) {
        return Response.json(firstAttempt.payload, { status: firstAttempt.status, headers: corsHeaders })
      }

      const generatedText = extractGeneratedText(firstAttempt.completion)

      // Fallback: если модель вернула tool_calls/refusal/пустой content — пробуем “дожать” текстом.
      if (!generatedText) {
        return Response.json(
          {
            error: "Пустой ответ от модели",
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
  } catch (error: unknown) {
    console.error("Ошибка генерации:", error)
    console.error("Стек ошибки:", error instanceof Error ? error.stack : undefined)
    return Response.json(
      {
        error: "Failed to generate result",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    )
  }
}
