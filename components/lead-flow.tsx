"use client"

import { useState } from "react"
import { URLSubmissionStep } from "./url-submission-step"
import { ApartmentSizeStep } from "./apartment-size-step"
import { LoadingStep } from "./loading-step"
import { ResultStep } from "./result-step"
import { EmailCaptureStep } from "./email-capture-step"
import { SuccessStep } from "./success-step"

export type FlowStep = "url" | "apartment" | "loading" | "result" | "email" | "success"

export function LeadFlow() {
  const [step, setStep] = useState<FlowStep>("url")
  const [url, setUrl] = useState("")
  const [leadId, setLeadId] = useState("")
  const [apartmentSize, setApartmentSize] = useState(0)
  const [result, setResult] = useState<{ type: string; text: string }>({ type: "text", text: "" })

  return (
    <div className="w-full max-w-2xl">
      {step === "url" && (
        <URLSubmissionStep
          onSubmit={(submittedUrl, id) => {
            setUrl(submittedUrl)
            setLeadId(id)
            setStep("apartment")
          }}
        />
      )}
      {step === "apartment" && (
        <ApartmentSizeStep
          onSubmit={(size) => {
            setApartmentSize(size)
            setStep("loading")
          }}
        />
      )}
      {step === "loading" && (
        <LoadingStep
          url={url}
          leadId={leadId}
          apartmentSize={apartmentSize}
          onComplete={(generatedResult) => {
            setResult(generatedResult)
            setStep("result")
          }}
        />
      )}
      {step === "result" && <ResultStep result={result} onContinue={() => setStep("email")} />}
      {step === "email" && <EmailCaptureStep leadId={leadId} result={result} onSuccess={() => setStep("success")} />}
      {step === "success" && (
        <SuccessStep
          onRestart={() => {
            setUrl("")
            setLeadId("")
            setApartmentSize(0)
            setResult({ type: "text", text: "" })
            setStep("url")
          }}
        />
      )}
    </div>
  )
}
