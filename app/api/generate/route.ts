import { createClient } from "@/lib/supabase/server"
import { getGlobalTextPrompt, getGlobalImagePrompt, getTextModel, getImageModel } from "@/app/actions/system-settings"
import { extractTextFromFile, isImageFile } from "@/lib/file-parser"
import { saveBase64ImageToStorage, saveImageToStorage } from "@/lib/utils/image-storage"
import { generateText, generateImage } from "ai"
import { openai } from "@/lib/ai/openai"

// Интерфейс для результата базы знаний с поддержкой изображений
interface KnowledgeBaseResult {
  textContent: string
  images: Array<{ fileName: string; base64: string; mimeType: string }>
}

interface ContextFieldOption {
  value: string
  label: string
  image: string | null
}

interface ContextFormField {
  field_key: string
  field_type: string
  field_label: string
  options: ContextFieldOption[]
}

interface SelectedOptionImageRef {
  fieldKey: string
  fieldLabel: string
  optionValue: string
  optionLabel: string
  imageUrl: string
}

interface CustomFieldsProcessingResult {
  customFieldsContext: string
  inputImages: Record<string, string>
  selectedOptionImageRefs: SelectedOptionImageRef[]
}

// Динамический импорт heic-convert для конвертации HEIC в JPEG
async function getHeicConvert() {
  const heicModule = await import("heic-convert")
  return heicModule.default || heicModule
}

/**
 * Конвертирует HEIC изображение в JPEG
 */
async function convertHeicToJpeg(buffer: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    const convert = await getHeicConvert()
    const outputBuffer = await convert({
      buffer: buffer as unknown as ArrayBuffer,
      format: "JPEG",
      quality: 0.9,
    })
    return { buffer: Buffer.from(outputBuffer as unknown as ArrayBuffer), mimeType: "image/jpeg" }
  } catch (error) {
    console.error("Ошибка конвертации HEIC:", error)
    throw new Error("Не удалось конвертировать HEIC изображение")
  }
}

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

function getContextOptionLabel(field: ContextFormField | undefined, rawValue: string): string {
  if (!field || field.options.length === 0) return rawValue

  const matchedOption = field.options.find((option) => option.value === rawValue)
  return matchedOption?.label || rawValue
}

function formatValueForAiContext(field: ContextFormField | undefined, value: unknown): string {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => String(item))
      .filter((item) => item.trim().length > 0)
      .map((item) => getContextOptionLabel(field, item))

    return items.join(", ")
  }

  if (typeof value === "boolean") return value ? "Да" : "Нет"
  if (typeof value === "string") return getContextOptionLabel(field, value)
  return String(value)
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.some((item) => String(item).trim().length > 0)
  return true
}

function normalizeFieldOptions(rawOptions: unknown): ContextFieldOption[] {
  if (!Array.isArray(rawOptions)) return []

  const normalized: ContextFieldOption[] = []

  for (const rawOption of rawOptions) {
    if (!rawOption || typeof rawOption !== "object") continue
    const option = rawOption as Record<string, unknown>
    if (typeof option.value !== "string" || typeof option.label !== "string") continue

    normalized.push({
      value: option.value,
      label: option.label,
      image: typeof option.image === "string" ? option.image : null,
    })
  }

  return normalized
}

function normalizeContextFields(rawFieldsData: unknown): ContextFormField[] {
  if (!Array.isArray(rawFieldsData)) return []

  const normalized: ContextFormField[] = []

  for (const rawField of rawFieldsData) {
    if (!rawField || typeof rawField !== "object") continue
    const field = rawField as Record<string, unknown>

    if (
      typeof field.field_key !== "string" ||
      typeof field.field_type !== "string" ||
      typeof field.field_label !== "string"
    ) {
      continue
    }

    normalized.push({
      field_key: field.field_key,
      field_type: field.field_type,
      field_label: field.field_label,
      options: normalizeFieldOptions(field.options),
    })
  }

  return normalized
}

function toSelectedValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter((v) => v.trim().length > 0)
  if (typeof value === "string" && value.trim()) return [value]
  return []
}

function collectSelectedOptionImageRefs(
  customFields: Record<string, unknown>,
  contextFieldsByKey: Map<string, ContextFormField>
): SelectedOptionImageRef[] {
  const refs: SelectedOptionImageRef[] = []
  const usedPairs = new Set<string>()

  for (const [fieldKey, rawValue] of Object.entries(customFields)) {
    const field = contextFieldsByKey.get(fieldKey)
    if (!field?.options || field.options.length === 0) continue

    const selectedValues = toSelectedValues(rawValue)
    if (selectedValues.length === 0) continue

    for (const selectedValue of selectedValues) {
      const option = field.options.find((item) => item.value === selectedValue)
      if (!option?.image) continue

      const dedupeKey = `${fieldKey}:${selectedValue}:${option.image}`
      if (usedPairs.has(dedupeKey)) continue
      usedPairs.add(dedupeKey)

      refs.push({
        fieldKey,
        fieldLabel: field.field_label,
        optionValue: selectedValue,
        optionLabel: option.label,
        imageUrl: option.image,
      })
    }
  }

  return refs
}

function processCustomFieldsForContext(params: {
  customFields: Record<string, unknown>
  contextFieldsByKey: Map<string, ContextFormField>
  imageFieldKeys: Set<string>
}): CustomFieldsProcessingResult {
  const { customFields, contextFieldsByKey, imageFieldKeys } = params

  const inputImages: Record<string, string> = {}
  const selectedOptionImageRefs = collectSelectedOptionImageRefs(customFields, contextFieldsByKey)
  let customFieldsContext = "\n\n--- Данные пользователя ---\n"

  for (const [key, value] of Object.entries(customFields)) {
    if (!hasMeaningfulValue(value)) continue

    const fieldMeta = contextFieldsByKey.get(key)
    const contextFieldName = fieldMeta?.field_label || key

    // Исключаем image-поля из текстового контекста, но сохраняем как input image
    if (imageFieldKeys.has(key)) {
      if (typeof value === "string" && value.startsWith("data:image/")) {
        inputImages[key] = value
      }
      continue
    }

    const formattedValue = formatValueForAiContext(fieldMeta, value)
    if (formattedValue) customFieldsContext += `- ${contextFieldName}: ${formattedValue}\n`
  }

  if (selectedOptionImageRefs.length > 0) {
    customFieldsContext += `\n--- Выбранные визуальные референсы ---\n`
    selectedOptionImageRefs.forEach((ref) => {
      customFieldsContext += `- ${ref.fieldLabel}: ${ref.optionLabel}\n`
    })
  }

  return {
    customFieldsContext,
    inputImages,
    selectedOptionImageRefs,
  }
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
 * Загружает и извлекает контент из файлов базы знаний
 * Возвращает текстовый контент и изображения отдельно для multimodal API
 */
async function getKnowledgeBaseContent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formId: string
): Promise<KnowledgeBaseResult> {
  const result: KnowledgeBaseResult = {
    textContent: "",
    images: [],
  }

  try {
    // Получаем список файлов
    const { data: files, error } = await supabase
      .from("form_knowledge_files")
      .select("*")
      .eq("form_id", formId)
      .order("created_at", { ascending: true })

    if (error || !files || files.length === 0) {
      return result
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

        const arrayBuffer = await fileData.arrayBuffer()
        let buffer = Buffer.from(arrayBuffer)
        let mimeType = file.file_type

        // Проверяем, является ли файл изображением
        if (isImageFile(file.file_type, file.file_name)) {
          // Конвертируем HEIC в JPEG (OpenAI не поддерживает HEIC)
          if (file.file_type === "image/heic" || file.file_name.toLowerCase().endsWith(".heic")) {
            try {
              const converted = await convertHeicToJpeg(buffer)
              buffer = converted.buffer as Buffer<ArrayBuffer>
              mimeType = converted.mimeType
              console.log(`HEIC файл ${file.file_name} конвертирован в JPEG`)
            } catch (convertError) {
              console.error(`Ошибка конвертации HEIC ${file.file_name}:`, convertError)
              continue
            }
          }

          // Кодируем изображение в base64
          const base64 = buffer.toString("base64")
          result.images.push({
            fileName: file.file_name,
            base64,
            mimeType,
          })
          console.log(`Изображение ${file.file_name} добавлено в контекст базы знаний`)
        } else {
          // Извлекаем текст из файла
          const text = await extractTextFromFile(buffer, file.file_type, file.file_name)

          if (text) {
            // Не обрезаем файлы - используем полный текст
            fileContents.push(`--- Файл: ${file.file_name} ---\n${text}`)
          }
        }
      } catch (fileError) {
        console.error(`Ошибка обработки файла ${file.file_name}:`, fileError)
      }
    }

    if (fileContents.length > 0) {
      result.textContent = fileContents.join("\n\n")
    }

    return result
  } catch (error) {
    console.error("Ошибка получения базы знаний:", error)
    return result
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
      .select("field_key, field_type, field_label, options")
      .eq("form_id", formId)

    const contextFields = normalizeContextFields(fieldsData)

    const contextFieldsByKey = new Map(contextFields.map((field) => [field.field_key, field]))
    const urlFields = contextFields.filter((field) => field.field_type === "url")
    const imageFields = contextFields.filter((field) => field.field_type === "image")

    // Форматируем кастомные поля для включения в контекст
    // Извлекаем image поля отдельно - они не должны попадать в текстовый контекст
    const imageFieldKeys = new Set(imageFields.map(f => f.field_key))
    let customFieldsContext = ""
    let selectedOptionImageRefs: SelectedOptionImageRef[] = []
    let inputImages: Record<string, string> = {}
    
    if (customFields && typeof customFields === "object" && Object.keys(customFields).length > 0) {
      const processedCustomFields = processCustomFieldsForContext({
        customFields: customFields as Record<string, unknown>,
        contextFieldsByKey,
        imageFieldKeys,
      })

      customFieldsContext = processedCustomFields.customFieldsContext
      selectedOptionImageRefs = processedCustomFields.selectedOptionImageRefs
      inputImages = processedCustomFields.inputImages
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
    let knowledgeBaseImages: Array<{ fileName: string; base64: string; mimeType: string }> = []
    
    if (useKnowledgeBase) {
      // Получаем контент из файлов базы знаний (текст и изображения раздельно)
      const knowledgeBaseResult = await getKnowledgeBaseContent(supabase, formId)
      knowledgeBaseImages = knowledgeBaseResult.images
      
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

      // Объединяем текстовый контент базы знаний
      const knowledgeParts = [knowledgeBaseResult.textContent, knowledgeUrlContent].filter(Boolean)
      if (knowledgeParts.length > 0) {
        knowledgeBaseContext = `\n\n=== БАЗА ЗНАНИЙ ===\n${knowledgeParts.join("\n\n")}\n=== КОНЕЦ БАЗЫ ЗНАНИЙ ===`
      }
      
      // Логируем количество изображений в базе знаний
      if (knowledgeBaseImages.length > 0) {
        console.log(`База знаний содержит ${knowledgeBaseImages.length} изображение(й)`)
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

      // gpt-image-1 поддерживает до 32K символов промпта
      // Используем GPT для трансформации сырого контекста в визуальное описание
      const maxContextChars = 24000
      const maxImagePromptChars = 16000
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
      const hasSelectedOptionImage = selectedOptionImageRefs.length > 0
      const useEditAPI = hasInputImage || hasSelectedOptionImage

      // Создаем короткий промпт через AI SDK generateText
      let compressedPrompt = ""
      let promptSource: "ai-sdk" | "fallback" = "ai-sdk"
      try {
        // Инструкции для промпта зависят от режима
        const promptInstructions = useEditAPI
          ? `На основе предоставленного контекста создай детальный промпт для редактирования изображения. Пользователь передал визуальные референсы (загруженные изображения и/или выбранные картинки из опций формы), и нужно описать, ЧТО ИЗМЕНИТЬ, СОХРАНИТЬ или ДОБАВИТЬ, опираясь на эти референсы. Промпт должен быть на английском языке и описывать конкретные изменения. Фокусируйся на действиях редактирования, а не на описании всей сцены.`
          : `На основе предоставленного контекста создай детальный промпт для генерации изображения. Промпт должен быть на английском языке и описывать конкретные визуальные детали: элементы, цвета, стиль, композицию, настроение. Будь максимально точен и подробен — модель может обработать длинные промпты.`

        const { text: generatedPrompt } = await generateText({
          model: openai(textModel),
          system: `${imageSystemPrompt}\n\n${promptInstructions}`,
          prompt: limitedContext,
          maxOutputTokens: 4000,
        })

        compressedPrompt = generatedPrompt || ""
      } catch (promptError: unknown) {
        console.error("Ошибка создания промпта через AI SDK:", promptError)
        promptSource = "fallback"
        compressedPrompt = buildFallbackImagePrompt({
          imageSystemPrompt,
          context: limitedContext,
          maxLength: maxImagePromptChars,
        })
      }

      if (!compressedPrompt) {
        promptSource = "fallback"
        compressedPrompt = buildFallbackImagePrompt({
          imageSystemPrompt,
          context: limitedContext,
          maxLength: maxImagePromptChars,
        })
      }

      // Добавляем системный промпт напрямую в финальный промпт для image модели,
      // чтобы инструкции по стилю/формату гарантированно дошли до gpt-image-1
      const fullImagePrompt = `${imageSystemPrompt}\n\n---\n\n${compressedPrompt}`
      const { text: finalPrompt, wasTruncated: wasPromptTruncated } = limitTextByChars({
        value: fullImagePrompt,
        maxLength: maxImagePromptChars,
      })
      compressedPrompt = finalPrompt

      console.log("Источник промпта изображения:", promptSource)
      console.log("Размер сжатого промпта:", compressedPrompt.length, "символов")
      if (wasPromptTruncated) {
        console.log("Промпт обрезан до", maxImagePromptChars, "символов")
      }
      console.log("Превью промпта изображения:", compressedPrompt.slice(0, 200) + "...")

      // Генерируем изображение с помощью AI SDK generateImage
      let generatedImageBase64: string | null = null
      
      try {
        if (useEditAPI) {
          // Используем Image Edit API для редактирования входных изображений/референсов
          console.log("Использование Images Edit API с визуальными референсами через AI SDK")

          const promptImages: Array<Buffer | string> = []

          // 1) Base64 изображения из image-полей формы
          Object.values(inputImages).forEach((base64Image) => {
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "")
            if (!base64Data) return
            promptImages.push(Buffer.from(base64Data, "base64"))
          })

          // 2) URL изображений выбранных опций (List/Dropdown)
          selectedOptionImageRefs.forEach((ref) => {
            promptImages.push(ref.imageUrl)
          })

          // Ограничиваем количество входных изображений для стабильности
          const limitedPromptImages = promptImages.slice(0, 6)
          console.log("Количество входных референсов для image edit:", limitedPromptImages.length)

          if (limitedPromptImages.length === 0) {
            throw new Error("Не удалось подготовить выбранные изображения для image edit")
          }
          
          // AI SDK generateImage с prompt object для редактирования
          const { images } = await generateImage({
            model: openai.image(imageModel),
            prompt: {
              text: compressedPrompt,
              images: limitedPromptImages,
            },
            size: "1024x1024" as const,
          })
          
          if (images && images.length > 0) {
            generatedImageBase64 = images[0].base64
          }
        } else {
          // Стандартная генерация изображения
          console.log("Генерация изображения через AI SDK generateImage")
          
          const { images } = await generateImage({
            model: openai.image(imageModel),
            prompt: compressedPrompt,
            size: "1024x1024" as const,
          })
          
          if (images && images.length > 0) {
            generatedImageBase64 = images[0].base64
          }
        }
      } catch (imageGenError: unknown) {
        console.error("Ошибка генерации изображения через AI SDK:", imageGenError)
        return Response.json(
          {
            error: "Ошибка генерации изображения",
            details: imageGenError instanceof Error ? imageGenError.message : "Не удалось сгенерировать изображение",
          },
          { status: 500, headers: corsHeaders },
        )
      }

      if (!generatedImageBase64) {
        console.error("Пустой результат генерации изображения")
        return Response.json(
          {
            error: "Пустой ответ от API",
            details: "API не вернуло изображение. Попробуйте другие настройки промптов.",
          },
          { status: 500, headers: corsHeaders },
        )
      }
      
      // AI SDK возвращает base64, URL больше не используется
      const tempImageBase64 = generatedImageBase64

      // Сохраняем изображение в Supabase Storage для постоянного хранения
      const leadId = crypto.randomUUID()
      const imageUrl = await saveBase64ImageToStorage({
        base64: tempImageBase64,
        leadId,
      })

      // Используем сохранённый URL или fallback на data URL
      const finalImageUrl = imageUrl || `data:image/png;base64,${tempImageBase64}`

      if (!imageUrl) {
        console.warn("Не удалось сохранить изображение в хранилище, используется временный ответ")
      }

      // Для формата image_with_text генерируем также текстовое описание
      if (resultFormat === "image_with_text") {
        const textModelForDescription = await getTextModel()
        
        if (!textModelForDescription) {
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
          // Инструкция для генерации описания результата
          const resultDescriptionInstruction = `На основе всего предоставленного контекста создай краткое описание ГОТОВОГО РЕЗУЛЬТАТА (2-4 предложения). Опиши что получилось, какие ключевые характеристики имеет результат, для чего он подходит. Пиши как презентацию завершённой работы для клиента. НЕ пиши технические инструкции, промпты или описание процесса создания.`

          // Формируем user message с контекстом для генерации текста
          const userMessage = `${normalizedMainUrl ? `URL: ${normalizedMainUrl}\n\n` : ""}${urlContent ? `--- Контент страницы ---\n${urlContent}\n` : ""}${additionalUrlsContext}${customFieldsContext}${knowledgeBaseContext}${resultDescriptionInstruction}`

          try {
            // Используем AI SDK generateText для текста к изображению
            const { text: generatedText } = await generateText({
              model: openai(textModelForDescription),
              system: textSystemPrompt,
              prompt: userMessage,
            })

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
      // ============================================
      // ТЕКСТОВАЯ ГЕНЕРАЦИЯ С ИСПОЛЬЗОВАНИЕМ AI SDK
      // ============================================
      
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

      // Формируем user message с контекстом
      const userMessage = `${normalizedMainUrl ? `URL: ${normalizedMainUrl}\n\n` : ""}${urlContent ? `--- Контент страницы ---\n${urlContent}\n` : ""}${additionalUrlsContext}${customFieldsContext}${knowledgeBaseContext}

Please provide your analysis and recommendations.`

      // Формируем контент сообщения с поддержкой multimodal (изображения из базы знаний)
      type UserContentPart = 
        | { type: "text"; text: string }
        | { type: "image"; image: string }
      
      let userContent: string | UserContentPart[]
      
      if (knowledgeBaseImages.length > 0) {
        // Multimodal: текст + изображения из базы знаний
        userContent = [
          { type: "text", text: userMessage },
          ...knowledgeBaseImages.map(img => ({
            type: "image" as const,
            image: `data:${img.mimeType};base64,${img.base64}`,
          })),
        ]
      } else {
        // Только текст
        userContent = userMessage
      }

      try {
        // Используем generateText вместо streamText для надёжности с multimodal
        const { text: generatedText } = await generateText({
          model: openai(textModel),
          system: textSystemPrompt,
          messages: [
            {
              role: "user",
              content: userContent,
            },
          ],
        })

        return Response.json(
          {
            success: true,
            result: {
              type: "text",
              text: generatedText || "",
            },
          },
          { headers: corsHeaders },
        )
      } catch (genError: unknown) {
        console.error("Ошибка генерации текста от AI SDK:", genError)
        return Response.json(
          {
            error: "Ошибка генерации текста",
            details: genError instanceof Error ? genError.message : "Unknown generation error",
          },
          { status: 500, headers: corsHeaders },
        )
      }
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
