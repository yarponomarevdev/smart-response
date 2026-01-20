import { marked } from "marked"
import type { Content, ContentText, ContentColumns } from "pdfmake/interfaces"

/**
 * Конвертирует markdown в формат pdfmake с поддержкой:
 * - Заголовков (h1-h4)
 * - Жирного текста и курсива
 * - Списков (маркированных и нумерованных)
 * - Параграфов
 */
export async function markdownToPdfContent(markdown: string): Promise<Content[]> {
  const tokens = marked.lexer(markdown)
  const content: Content[] = []

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const level = token.depth
        const text = parseInlineTokens(token.tokens || [])
        
        content.push({
          text,
          style: `header${level}`,
        } as ContentText)
        break
      }

      case "paragraph": {
        const text = parseInlineTokens(token.tokens || [])
        content.push({
          text,
          style: "paragraph",
        } as ContentText)
        break
      }

      case "list": {
        const items = token.items.map((item) => {
          return parseInlineTokens(item.tokens || [])
        })

        if (token.ordered) {
          content.push({
            ol: items,
            style: "list",
          })
        } else {
          content.push({
            ul: items,
            style: "list",
          })
        }
        break
      }

      case "blockquote": {
        const text = token.tokens?.map(t => {
          if (t.type === "paragraph") {
            return parseInlineTokens(t.tokens || [])
          }
          return ""
        }).filter(Boolean).join("\n")
        
        content.push({
          text: text || "",
          style: "quote",
        } as ContentText)
        break
      }

      case "hr":
        content.push({
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 0,
              x2: 515,
              y2: 0,
              lineWidth: 1,
              lineColor: "#cccccc",
            },
          ],
          margin: [0, 10, 0, 10],
        })
        break

      case "space":
        // Добавляем небольшой отступ для пустых строк
        break

      default:
        break
    }
  }

  return content
}

/**
 * Парсит inline токены (жирный текст, курсив, обычный текст)
 */
function parseInlineTokens(tokens: marked.Token[]): ContentText {
  const parts: ContentText[] = []

  for (const token of tokens) {
    if (token.type === "strong") {
      const innerTokens = (token as any).tokens || []
      parts.push({
        text: extractText(innerTokens),
        bold: true,
      })
    } else if (token.type === "em") {
      const innerTokens = (token as any).tokens || []
      parts.push({
        text: extractText(innerTokens),
        italics: true,
      })
    } else if (token.type === "text") {
      parts.push({
        text: token.raw || (token as any).text || "",
      })
    } else if (token.type === "codespan") {
      parts.push({
        text: (token as any).text || token.raw,
        font: "Courier",
        fontSize: 9,
        background: "#f5f5f5",
      })
    } else if (token.type === "link") {
      const innerTokens = (token as any).tokens || []
      parts.push({
        text: extractText(innerTokens),
        color: "#0066cc",
        decoration: "underline",
      })
    } else if (token.type === "br") {
      parts.push({
        text: "\n",
      })
    }
  }

  // Если есть несколько частей, возвращаем массив
  if (parts.length === 0) {
    return { text: "" }
  } else if (parts.length === 1) {
    return parts[0]
  } else {
    return {
      text: parts,
    }
  }
}

/**
 * Извлекает простой текст из токенов
 */
function extractText(tokens: marked.Token[]): string {
  return tokens
    .map((token) => {
      if (token.type === "text") {
        return token.raw || (token as any).text || ""
      } else if (token.type === "strong" || token.type === "em") {
        return extractText((token as any).tokens || [])
      } else if (token.type === "codespan") {
        return (token as any).text || token.raw
      } else if (token.type === "link") {
        return extractText((token as any).tokens || [])
      }
      return ""
    })
    .join("")
}

/**
 * Возвращает стили для pdfmake документа
 */
export function getPdfStyles() {
  return {
    header1: {
      fontSize: 18,
      bold: true,
      margin: [0, 10, 0, 8] as [number, number, number, number],
    },
    header2: {
      fontSize: 16,
      bold: true,
      margin: [0, 8, 0, 6] as [number, number, number, number],
    },
    header3: {
      fontSize: 14,
      bold: true,
      margin: [0, 6, 0, 4] as [number, number, number, number],
    },
    header4: {
      fontSize: 12,
      bold: true,
      margin: [0, 5, 0, 3] as [number, number, number, number],
    },
    paragraph: {
      fontSize: 11,
      margin: [0, 0, 0, 8] as [number, number, number, number],
      lineHeight: 1.4,
    },
    list: {
      fontSize: 11,
      margin: [0, 0, 0, 5] as [number, number, number, number],
      lineHeight: 1.4,
    },
    quote: {
      fontSize: 11,
      italics: true,
      color: "#666666",
      margin: [10, 5, 0, 5] as [number, number, number, number],
    },
  }
}
