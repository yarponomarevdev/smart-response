import { LeadFlow } from "@/components/lead-flow"
import { AuthHeader } from "@/components/auth-header"

const MAIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col px-4 sm:px-6 md:px-[10%] lg:px-0">
      <div className="flex justify-end p-2 sm:p-4">
        <AuthHeader />
      </div>
      <div className="flex-1 flex items-center justify-center py-4 sm:py-8">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-start-3 md:col-span-8 lg:col-start-4 lg:col-span-6">
            <LeadFlow formId={MAIN_FORM_ID} />
          </div>
        </div>
      </div>
    </main>
  )
}
