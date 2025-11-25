import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LeadFlow } from "@/components/lead-flow"

export default async function FormPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Fetch form details
  const { data: form, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", params.id)
    .eq("is_active", true)
    .single()

  if (error || !form) {
    notFound()
  }

  // Check if form has reached lead limit
  if (form.lead_count >= form.lead_limit) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Form Limit Reached</h1>
          <p className="text-muted-foreground">
            This form has reached its maximum number of leads ({form.lead_limit}).
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <LeadFlow formId={params.id} />
    </main>
  )
}
