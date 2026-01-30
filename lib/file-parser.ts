/**
 * Парсер файлов для извлечения текста из различных форматов
 * Поддерживает: PDF, DOCX, TXT, MD, CSV, JSON, а также изображения (PNG, JPEG, WebP, GIF, HEIC)
 */

// MIME-типы изображений
const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/heic",
]

// Расширения изображений
const IMAGE_EXTENSIONS = [".png", ".jpeg", ".jpg", ".webp", ".gif", ".heic"]

// Динамические импорты для CommonJS модулей
async function getPdfParse() {
  const pdfModule = await import("pdf-parse")
  return pdfModule.default || pdfModule
}

async function getMammoth() {
  const mammothModule = await import("mammoth")
  return mammothModule.default || mammothModule
}

// Максимальный размер извлекаемого текста (в символах)
const MAX_TEXT_LENGTH = 50000

/**
 * Извлекает текст из файла на основе его MIME-типа
 */
export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  try {
    let text = ""

    switch (mimeType) {
      case "application/pdf":
        text = await extractFromPdf(buffer)
        break

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        text = await extractFromDocx(buffer)
        break

      case "text/plain":
      case "text/markdown":
        text = buffer.toString("utf-8")
        break

      case "text/csv":
        text = extractFromCsv(buffer.toString("utf-8"))
        break

      case "application/json":
        text = extractFromJson(buffer.toString("utf-8"))
        break

      default:
        // Попытка прочитать как текст для неизвестных типов
        if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
          text = buffer.toString("utf-8")
        } else if (fileName.endsWith(".csv")) {
          text = extractFromCsv(buffer.toString("utf-8"))
        } else if (fileName.endsWith(".json")) {
          text = extractFromJson(buffer.toString("utf-8"))
        } else if (fileName.endsWith(".pdf")) {
          text = await extractFromPdf(buffer)
        } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
          text = await extractFromDocx(buffer)
        } else {
          throw new Error(`Неподдерживаемый тип файла: ${mimeType}`)
        }
    }

    // Ограничиваем размер текста
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.slice(0, MAX_TEXT_LENGTH) + "\n\n[Текст обрезан из-за ограничений размера]"
    }

    return text.trim()
  } catch (error) {
    console.error(`Ошибка извлечения текста из ${fileName}:`, error)
    throw error
  }
}

/**
 * Извлекает текст из PDF
 */
async function extractFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getPdfParse()
    const data = await pdf(buffer)
    return data.text || ""
  } catch (error) {
    console.error("Ошибка парсинга PDF:", error)
    throw new Error("Не удалось извлечь текст из PDF файла")
  }
}

/**
 * Извлекает текст из DOCX
 */
async function extractFromDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await getMammoth()
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ""
  } catch (error) {
    console.error("Ошибка парсинга DOCX:", error)
    throw new Error("Не удалось извлечь текст из DOCX файла")
  }
}

/**
 * Форматирует CSV в читаемый текст
 */
function extractFromCsv(content: string): string {
  const lines = content.split("\n").filter((line) => line.trim())
  if (lines.length === 0) return ""

  // Парсим заголовки
  const headers = parseCSVLine(lines[0])
  
  // Форматируем данные
  const formattedRows = lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line)
    const row = headers.map((header, i) => `${header}: ${values[i] || ""}`).join(", ")
    return `Строка ${index + 1}: ${row}`
  })

  return `Заголовки: ${headers.join(", ")}\n\n${formattedRows.join("\n")}`
}

/**
 * Парсит строку CSV с учётом кавычек
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

/**
 * Форматирует JSON в читаемый текст
 */
function extractFromJson(content: string): string {
  try {
    const data = JSON.parse(content)
    return formatJsonToText(data)
  } catch {
    // Если не валидный JSON, возвращаем как есть
    return content
  }
}

/**
 * Рекурсивно форматирует JSON объект в текст
 */
function formatJsonToText(data: unknown, indent = 0): string {
  const prefix = "  ".repeat(indent)

  if (data === null || data === undefined) {
    return `${prefix}(пусто)`
  }

  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return `${prefix}${data}`
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return `${prefix}(пустой список)`
    return data.map((item, i) => `${prefix}${i + 1}. ${formatJsonToText(item, 0)}`).join("\n")
  }

  if (typeof data === "object") {
    const entries = Object.entries(data)
    if (entries.length === 0) return `${prefix}(пустой объект)`
    return entries
      .map(([key, value]) => {
        const formattedValue = formatJsonToText(value, indent + 1)
        if (typeof value === "object" && value !== null) {
          return `${prefix}${key}:\n${formattedValue}`
        }
        return `${prefix}${key}: ${formattedValue.trim()}`
      })
      .join("\n")
  }

  return String(data)
}

/**
 * Проверяет, является ли файл изображением
 */
export function isImageFile(mimeType: string, fileName: string): boolean {
  if (IMAGE_MIME_TYPES.includes(mimeType)) {
    return true
  }

  const lowerFileName = fileName.toLowerCase()
  return IMAGE_EXTENSIONS.some((ext) => lowerFileName.endsWith(ext))
}

/**
 * Проверяет, поддерживается ли тип файла
 */
export function isSupportedFileType(mimeType: string, fileName: string): boolean {
  const supportedMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    ...IMAGE_MIME_TYPES,
  ]

  const supportedExtensions = [".pdf", ".docx", ".doc", ".txt", ".md", ".csv", ".json", ...IMAGE_EXTENSIONS]

  if (supportedMimeTypes.includes(mimeType)) {
    return true
  }

  const lowerFileName = fileName.toLowerCase()
  return supportedExtensions.some((ext) => lowerFileName.endsWith(ext))
}

/**
 * Возвращает человекочитаемое название типа файла
 */
export function getFileTypeLabel(mimeType: string, fileName: string): string {
  const lowerFileName = fileName.toLowerCase()

  if (mimeType === "application/pdf" || lowerFileName.endsWith(".pdf")) {
    return "PDF"
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerFileName.endsWith(".docx")
  ) {
    return "DOCX"
  }
  if (mimeType === "application/msword" || lowerFileName.endsWith(".doc")) {
    return "DOC"
  }
  if (mimeType === "text/markdown" || lowerFileName.endsWith(".md")) {
    return "Markdown"
  }
  if (mimeType === "text/csv" || lowerFileName.endsWith(".csv")) {
    return "CSV"
  }
  if (mimeType === "application/json" || lowerFileName.endsWith(".json")) {
    return "JSON"
  }
  if (mimeType === "text/plain" || lowerFileName.endsWith(".txt")) {
    return "Текст"
  }
  // Изображения
  if (mimeType === "image/png" || lowerFileName.endsWith(".png")) {
    return "PNG"
  }
  if (mimeType === "image/jpeg" || mimeType === "image/jpg" || lowerFileName.endsWith(".jpeg") || lowerFileName.endsWith(".jpg")) {
    return "JPEG"
  }
  if (mimeType === "image/webp" || lowerFileName.endsWith(".webp")) {
    return "WebP"
  }
  if (mimeType === "image/gif" || lowerFileName.endsWith(".gif")) {
    return "GIF"
  }
  if (mimeType === "image/heic" || lowerFileName.endsWith(".heic")) {
    return "HEIC"
  }

  return "Файл"
}
