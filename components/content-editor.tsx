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
  const [formId, setFormId] = useState<string | null>(null)
  const [content, setContent] = useState<Record<string, string>>({})
  const [loadingMessages, setLoadingMessages] = useState<string[]>([])
  const [systemPrompt, setSystemPrompt] = useState<string>("")
  const [resultFormat, setResultFormat] = useState<string>("text")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchFormAndContent()
  }, [])

  const fetchFormAndContent = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    // Get user's form
    const { data: userProfile } = await supabase.from("users").select("role").eq("id", user.id).single()

    let form
    if (userProfile?.role === "superadmin") {
      // Get superadmin's main form
      const { data } = await supabase.from("forms").select("id").eq("owner_id", user.id).single()
      form = data
    } else {
      // Get regular admin's form
      const { data } = await supabase.from("forms").select("id").eq("owner_id", user.id).single()
      form = data
    }

    if (form) {
      setFormId(form.id)
      await fetchContent(form.id)
    }
    setIsLoading(false)
  }

  const fetchContent = async (fId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.from("form_content").select("*").eq("form_id", fId)

    if (!error && data) {
      const contentMap: Record<string, string> = {}
      let messages: string[] = []
      let prompt = ""
      let format = "text"

      data.forEach((item: ContentItem) => {
        if (item.key === "loading_messages") {
          messages = item.value.messages || []
        } else if (item.key === "ai_system_prompt") {
          prompt = item.value.text || ""
        } else if (item.key === "ai_result_format") {
          format = item.value.format || "text"
        } else {
          contentMap[item.key] = item.value.text || ""
        }
      })

      setContent(contentMap)
      setLoadingMessages(messages)
      setSystemPrompt(prompt)
      setResultFormat(format)
    }
  }

  const handleSave = async () => {
    if (!formId) return

    setIsSaving(true)
    const supabase = createClient()

    // Update text content
    for (const [key, value] of Object.entries(content)) {
      await supabase
        .from("form_content")
        .upsert({ form_id: formId, key, value: { text: value } }, { onConflict: "form_id,key" })
    }

    // Update loading messages
    await supabase
      .from("form_content")
      .upsert(
        { form_id: formId, key: "loading_messages", value: { messages: loadingMessages } },
        { onConflict: "form_id,key" },
      )

    // Update AI settings
    await supabase
      .from("form_content")
      .upsert(
        { form_id: formId, key: "ai_system_prompt", value: { text: systemPrompt } },
        { onConflict: "form_id,key" },
      )

    await supabase
      .from("form_content")
      .upsert(
        { form_id: formId, key: "ai_result_format", value: { format: resultFormat } },
        { onConflict: "form_id,key" },
      )

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

  if (!formId) {
    return <div className="text-center py-8">No form found. Please create a form first.</div>
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
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter the system prompt for OpenAI..."
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This prompt instructs the AI on how to analyze websites and generate recommendations.
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
                <option value="image">Image (DALL-E)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Choose whether results should be plain text or generated as an image using DALL-E 3.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url_submission_title">URL Submission Title</Label>
            <Input
              id="url_submission_title"
              value={content.url_submission_title || ""}
              onChange={(e) => setContent({ ...content, url_submission_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url_submission_subtitle">URL Submission Subtitle</Label>
            <Textarea
              id="url_submission_subtitle"
              value={content.url_submission_subtitle || ""}
              onChange={(e) => setContent({ ...content, url_submission_subtitle: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url_submission_button">URL Submission Button Text</Label>
            <Input
              id="url_submission_button"
              value={content.url_submission_button || ""}
              onChange={(e) => setContent({ ...content, url_submission_button: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url_submission_note">URL Submission Note</Label>
            <Input
              id="url_submission_note"
              value={content.url_submission_note || ""}
              onChange={(e) => setContent({ ...content, url_submission_note: e.target.value })}
            />
          </div>

          {/* Loading Messages */}
          <div className="space-y-2">
            <Label>Loading Messages</Label>
            <p className="text-xs text-muted-foreground mb-2">Messages shown while AI generates the result</p>
            {loadingMessages.map((message, index) => (
              <Input
                key={index}
                value={message}
                onChange={(e) => handleLoadingMessageChange(index, e.target.value)}
                placeholder={`Loading message ${index + 1}`}
              />
            ))}
          </div>

          {/* Result fields */}
          <div className="space-y-2">
            <Label htmlFor="result_title">Result Title</Label>
            <Input
              id="result_title"
              value={content.result_title || ""}
              onChange={(e) => setContent({ ...content, result_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="result_subtitle">Result Subtitle</Label>
            <Textarea
              id="result_subtitle"
              value={content.result_subtitle || ""}
              onChange={(e) => setContent({ ...content, result_subtitle: e.target.value })}
            />
          </div>

          {/* Email Capture fields */}
          <div className="space-y-2">
            <Label htmlFor="email_title">Email Capture Title</Label>
            <Input
              id="email_title"
              value={content.email_title || ""}
              onChange={(e) => setContent({ ...content, email_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_subtitle">Email Capture Subtitle</Label>
            <Textarea
              id="email_subtitle"
              value={content.email_subtitle || ""}
              onChange={(e) => setContent({ ...content, email_subtitle: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_placeholder">Email Placeholder</Label>
            <Input
              id="email_placeholder"
              value={content.email_placeholder || ""}
              onChange={(e) => setContent({ ...content, email_placeholder: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_button">Email Button Text</Label>
            <Input
              id="email_button"
              value={content.email_button || ""}
              onChange={(e) => setContent({ ...content, email_button: e.target.value })}
            />
          </div>

          {/* Success fields */}
          <div className="space-y-2">
            <Label htmlFor="success_title">Success Title</Label>
            <Input
              id="success_title"
              value={content.success_title || ""}
              onChange={(e) => setContent({ ...content, success_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success_subtitle">Success Subtitle</Label>
            <Textarea
              id="success_subtitle"
              value={content.success_subtitle || ""}
              onChange={(e) => setContent({ ...content, success_subtitle: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success_share_text">Social Share Text</Label>
            <Textarea
              id="success_share_text"
              value={content.success_share_text || ""}
              onChange={(e) => setContent({ ...content, success_share_text: e.target.value })}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
