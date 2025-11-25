import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const { url, leadId, apartmentSize } = await req.json()

    const supabase = await createClient()

    // Fetch system prompt and result format from admin settings
    const { data: contentData } = await supabase
      .from("content")
      .select("key, value")
      .in("key", ["system_prompt", "result_format"])

    const systemPrompt =
      contentData?.find((c) => c.key === "system_prompt")?.value?.text ||
      "Analyze this URL and provide interior design recommendations."
    const resultFormat = contentData?.find((c) => c.key === "result_format")?.value?.type || "text"

    console.log("[v0] Generating result for URL:", url, "Format:", resultFormat, "Apartment size:", apartmentSize)

    // Generate text response using OpenAI
    const { text } = await generateText({
      model: "openai/gpt-4o",
      prompt: `${systemPrompt}\n\nURL: ${url}\nApartment size: ${apartmentSize} square meters\n\nProvide a detailed, personalized response.`,
      maxOutputTokens: 1000,
      temperature: 0.7,
    })

    console.log("[v0] Generated text:", text.substring(0, 100) + "...")

    // Update lead with generated result
    const { data: updatedLead, error } = await supabase
      .from("leads")
      .update({
        result_type: resultFormat,
        result_text: text,
        apartment_size: apartmentSize,
        status: "processed",
      })
      .eq("id", leadId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating lead:", error)
      throw error
    }

    console.log("[v0] Lead updated successfully")

    return Response.json({
      success: true,
      result: {
        type: resultFormat,
        text,
      },
    })
  } catch (error) {
    console.error("[v0] Generation error:", error)
    return Response.json({ error: "Failed to generate result" }, { status: 500 })
  }
}
