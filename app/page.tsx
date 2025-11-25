import { LeadFlow } from "@/components/lead-flow"
import { AuthHeader } from "@/components/auth-header"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()

  const SUPERADMIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"
  let mainFormId: string = SUPERADMIN_FORM_ID

  try {
    // Try to fetch the superadmin's form dynamically
    const { data: forms, error } = await supabase
      .from("forms")
      .select("id")
      .eq("owner_id", "14487afc-c1c1-46aa-9a7c-28803d9f4dfe")
      .limit(1)

    if (forms && forms.length > 0 && !error) {
      mainFormId = forms[0].id
    }
  } catch (error) {
    console.error("[v0] Error loading main form, using fallback:", error)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <AuthHeader />
      <LeadFlow formId={mainFormId} />
    </main>
  )
}
