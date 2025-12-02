import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LeadFlow } from "@/components/lead-flow"

export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch form details
  const { data: form, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single()

  if (error || !form) {
    notFound()
  }

  // Check if form has reached lead limit
  if (form.lead_count >= form.lead_limit) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 md:px-[10%] lg:px-0 py-4">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-start-3 md:col-span-8 lg:col-start-4 lg:col-span-6 text-center space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Form Limit Reached</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              This form has reached its maximum number of leads ({form.lead_limit}).
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 md:px-[10%] lg:px-0 py-4">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-start-3 md:col-span-8 lg:col-start-4 lg:col-span-6">
          <LeadFlow formId={id} />
        </div>
      </div>
    </main>
  )
}
