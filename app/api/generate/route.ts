import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

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

    // Extract text content from HTML (simple approach)
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000) // Limit to first 3000 chars to avoid token limits

    return textContent || "Unable to extract meaningful content from URL"
  } catch (error) {
    console.error("[v0] Error fetching URL:", error)
    return `Error fetching URL: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

export async function POST(req: Request) {
  try {
    const { url, leadId, formId } = await req.json()

    console.log("[v0] Starting generation for URL:", url, "Lead ID:", leadId, "Form ID:", formId)

    const supabase = await createClient()

    // Fetch system prompt and result format from form content or default content
    let contentQuery = supabase.from("content").select("key, value").in("key", ["system_prompt", "result_format"])

    if (formId) {
      contentQuery = supabase
        .from("form_content")
        .select("key, value")
        .eq("form_id", formId)
        .in("key", ["ai_system_prompt", "ai_result_format"])
    }

    const { data: contentData } = await contentQuery

    const defaultSystemPrompt = `You are an expert interior designer and home decor consultant. Analyze the provided content and give personalized, actionable recommendations.

IMPORTANT FORMATTING RULES:
- Write in plain text only, NO markdown formatting
- Do NOT use asterisks, hashtags, or any special characters for emphasis
- Use simple paragraphs separated by blank lines
- For lists, use simple dashes or numbers followed by a space
- Keep your response clean, readable, and professional
- Focus on practical, specific advice`

    const systemPrompt = contentData?.find((c) => c.key === "ai_system_prompt")?.value || defaultSystemPrompt

    const resultFormat = contentData?.find((c) => c.key === "ai_result_format")?.value || "text"

    console.log("[v0] Using result format:", resultFormat)

    console.log("[v0] Fetching URL content...")
    const urlContent = await fetchUrlContent(url)
    console.log("[v0] Fetched content length:", urlContent.length)

    if (resultFormat === "image") {
      console.log("[v0] Generating image with DALL-E 3...")

      const imagePrompt = `Create a beautiful, professional interior design mood board. Style: modern and elegant. Include: furniture arrangements, color palette, textures, and decor elements. Make it inspiring and cohesive.`

      const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        }),
      })

      if (!imageResponse.ok) {
        const errorData = await imageResponse.json()
        console.error("[v0] DALL-E API error:", errorData)
        throw new Error(`DALL-E API error: ${errorData.error?.message || "Unknown error"}`)
      }

      const imageData = await imageResponse.json()
      const imageUrl = imageData.data[0]?.url || ""

      console.log("[v0] Generated image URL:", imageUrl)

      // Update lead with generated image
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          result_type: "image",
          result_image_url: imageUrl,
          result_text: `Interior design inspiration generated for ${url}`,
          status: "processed",
        })
        .eq("id", leadId)

      if (updateError) {
        console.error("[v0] Error updating lead:", updateError)
        throw updateError
      }

      return Response.json({
        success: true,
        result: {
          type: "image",
          imageUrl: imageUrl,
          text: `Interior design inspiration generated for ${url}`,
        },
      })
    } else {
      console.log("[v0] Generating text with GPT-4o...")

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
              content: `I found this content from the URL: ${url}

Content:
${urlContent}

Based on this content, please provide detailed interior design recommendations. Include:
- Color palette suggestions
- Furniture style recommendations  
- Decor and accessory ideas
- Layout and space planning tips
- Specific product or style recommendations

Remember: Use plain text only, no markdown formatting.`,
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] OpenAI API error:", errorData)
        throw new Error(`OpenAI API error: ${errorData.error?.message || "Unknown error"}`)
      }

      const completion = await response.json()
      const generatedText = completion.choices[0]?.message?.content || ""

      console.log("[v0] Generated text length:", generatedText.length)

      // Update lead with generated result
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          result_type: "text",
          result_text: generatedText,
          status: "processed",
        })
        .eq("id", leadId)

      if (updateError) {
        console.error("[v0] Error updating lead:", updateError)
        throw updateError
      }

      console.log("[v0] Lead updated successfully")

      return Response.json({
        success: true,
        result: {
          type: "text",
          text: generatedText,
        },
      })
    }
  } catch (error: any) {
    console.error("[v0] Generation error:", error)
    return Response.json(
      {
        error: "Failed to generate result",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
