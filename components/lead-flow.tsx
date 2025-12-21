"use client"

import { useState } from "react"
import { URLSubmissionStep } from "./url-submission-step"
import { ContactsStep } from "./contacts-step"
import { GenerationStep } from "./generation-step"
import { SuccessStep } from "./success-step"

export type FlowStep = "url" | "contacts" | "generation" | "success"

const MAIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"

interface LeadFlowProps {
  formId?: string
}

interface ContactData {
  email: string
  phone?: string
  feedback?: boolean
}

export function LeadFlow({ formId }: LeadFlowProps = {}) {
  const effectiveFormId = formId || MAIN_FORM_ID
  const [step, setStep] = useState<FlowStep>("url")
  const [url, setUrl] = useState("")
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({})
  const [contactData, setContactData] = useState<ContactData>({ email: "" })
  const [result, setResult] = useState<{ type: string; text: string; imageUrl: string }>({
    type: "text",
    text: "",
    imageUrl: "",
  })

  return (
    <div className="w-full max-w-2xl mx-auto">
      {step === "url" && (
        <URLSubmissionStep
          formId={effectiveFormId}
          onSubmit={(submittedUrl, fields) => {
            setUrl(submittedUrl)
            setCustomFields(fields || {})
            setStep("contacts")
          }}
        />
      )}
      {step === "contacts" && (
        <ContactsStep
          formId={effectiveFormId}
          onSubmit={(data) => {
            setContactData(data)
            setStep("generation")
          }}
        />
      )}
      {step === "generation" && (
        <GenerationStep
          url={url}
          formId={effectiveFormId}
          customFields={customFields}
          contactData={contactData}
          onComplete={(generatedResult) => {
            setResult({
              type: generatedResult.type,
              text: generatedResult.text,
              imageUrl: generatedResult.imageUrl || "",
            })
            setStep("success")
          }}
        />
      )}
      {step === "success" && (
        <SuccessStep
          result={result}
          formId={effectiveFormId}
          onRestart={() => {
            setUrl("")
            setCustomFields({})
            setContactData({ email: "" })
            setResult({ type: "text", text: "", imageUrl: "" })
            setStep("url")
          }}
        />
      )}
    </div>
  )
}
