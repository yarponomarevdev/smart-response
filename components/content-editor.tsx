"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Save } from "lucide-react"

interface ContentItem {
  id: string
  key: string
  value: any
}

export function ContentEditor() {
  const [content, setContent] = useState<Record<string, string>>({})
  const [loadingMessages, setLoadingMessages] = useState<string[]>([])
  const [resultFormat, setResultFormat] = useState<string>("text")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("content").select("*")

    if (!error && data) {
      const contentMap: Record<string, string> = {}
      let messages: string[] = []
      let format = "text"

      data.forEach((item: ContentItem) => {
        if (item.key === "loading_messages") {
          messages = item.value.messages || []
        } else if (item.key === "result_format") {
          format = item.value.type || "text"
        } else {
          contentMap[item.key] = item.value.text || ""
        }
      })

      setContent(contentMap)
      setLoadingMessages(messages)
      setResultFormat(format)
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()

    // Update text content
    for (const [key, value] of Object.entries(content)) {
      await supabase
        .from("content")
        .update({ value: { text: value } })
        .eq("key", key)
    }

    // Update loading messages
    await supabase
      .from("content")
      .update({ value: { messages: loadingMessages } })
      .eq("key", "loading_messages")

    await supabase
      .from("content")
      .update({ value: { type: resultFormat } })
      .eq("key", "result_format")

    setIsSaving(false)
    alert("Content saved successfully!")
  }

  const handleLoadingMessageChange = (index: number, value: string) => {
    const newMessages = [...loadingMessages]
    newMessages[index] = value
    setLoadingMessages(newMessages)
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading content...</div>
  }

  return (
    <Card className="p-6">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Content Editor</h2>
            <p className="text-muted-foreground">Customize the text shown to users and AI settings</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="space-y-6">
          <div className="p-4 border border-accent/20 rounded-lg space-y-4 bg-accent/5">
            <h3 className="text-lg font-semibold text-accent">AI Settings</h3>

            <div className="space-y-2">
              <Label htmlFor="system_prompt">System Prompt (OpenAI)</Label>
              <Textarea
                id="system_prompt"
                value={content.system_prompt || ""}
                onChange={(e) => setContent({ ...content, system_prompt: e.target.value })}
                placeholder="Enter the system prompt for OpenAI to generate personalized recommendations..."
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This prompt will be sent to OpenAI along with the user's URL and apartment size.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="result_format">Result Format</Label>
              <select
                id="result_format"
                value={resultFormat}
                onChange={(e) => setResultFormat(e.target.value)}
                className="w-full h-10 px-3 rounded border border-input bg-background"
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Choose whether results should be text or image. Note: Image generation requires specific models.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero_title">Hero Title</Label>
            <Input
              id="hero_title"
              value={content.hero_title || ""}
              onChange={(e) => setContent({ ...content, hero_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
            <Textarea
              id="hero_subtitle"
              value={content.hero_subtitle || ""}
              onChange={(e) => setContent({ ...content, hero_subtitle: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apartment_size_title">Apartment Size Title</Label>
            <Input
              id="apartment_size_title"
              value={content.apartment_size_title || ""}
              onChange={(e) => setContent({ ...content, apartment_size_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apartment_size_description">Apartment Size Description</Label>
            <Textarea
              id="apartment_size_description"
              value={content.apartment_size_description || ""}
              onChange={(e) => setContent({ ...content, apartment_size_description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Loading Messages</Label>
            {loadingMessages.map((message, index) => (
              <Input
                key={index}
                value={message}
                onChange={(e) => handleLoadingMessageChange(index, e.target.value)}
                placeholder={`Loading message ${index + 1}`}
              />
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="result_title">Result Title</Label>
            <Input
              id="result_title"
              value={content.result_title || ""}
              onChange={(e) => setContent({ ...content, result_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="result_description">Result Description</Label>
            <Input
              id="result_description"
              value={content.result_description || ""}
              onChange={(e) => setContent({ ...content, result_description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta_title">Email CTA Title</Label>
            <Input
              id="cta_title"
              value={content.cta_title || ""}
              onChange={(e) => setContent({ ...content, cta_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta_description">Email CTA Description</Label>
            <Textarea
              id="cta_description"
              value={content.cta_description || ""}
              onChange={(e) => setContent({ ...content, cta_description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success_title">Success Title</Label>
            <Input
              id="success_title"
              value={content.success_title || ""}
              onChange={(e) => setContent({ ...content, success_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success_description">Success Description</Label>
            <Textarea
              id="success_description"
              value={content.success_description || ""}
              onChange={(e) => setContent({ ...content, success_description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="social_share_text">Social Share Text</Label>
            <Textarea
              id="social_share_text"
              value={content.social_share_text || ""}
              onChange={(e) => setContent({ ...content, social_share_text: e.target.value })}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
