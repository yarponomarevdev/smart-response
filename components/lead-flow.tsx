"use client"

import { useState } from "react"
import { URLSubmissionStep } from "./url-submission-step"
import { LoadingStep } from "./loading-step"
import { ResultStep } from "./result-step"
import { EmailCaptureStep } from "./email-capture-step"
import { SuccessStep } from "./success-step"

export type FlowStep = "url" | "loading" | "result" | "email" | "success"

interface LeadFlowProps {
  formId?: string
}

export function LeadFlow({ formId }: LeadFlowProps = {}) {
  const [step, setStep] = useState<FlowStep>("url")
  const [url, setUrl] = useState("")
  const [leadId, setLeadId] = useState("")
  const [result, setResult] = useState<{ type: string; text: string; imageUrl?: string }>({ type: "text", text: "" })

  return (
    <div className="w-full max-w-2xl">
      {step === "url" && (
        <URLSubmissionStep
          formId={formId}
          onSubmit={(submittedUrl, id) => {
            setUrl(submittedUrl)
            setLeadId(id)
            setStep("loading")
          }}
        />
      )}
      {step === "loading" && (
        <LoadingStep
          url={url}
          leadId={leadId}
          formId={formId}
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
          result={result}
          onRestart={() => {
            setUrl("")
            setLeadId("")
            setResult({ type: "text", text: "" })
            setStep("url")
          }}
        />
      )}
    </div>
  )
}
