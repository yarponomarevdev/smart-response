"use client"

import { useState } from "react"
import { URLSubmissionStep } from "./url-submission-step"
import { LoadingStep } from "./loading-step"
import { ResultStep } from "./result-step"
import { SuccessStep } from "./success-step"

export type FlowStep = "url" | "loading" | "result" | "success"

const MAIN_FORM_ID = "f5fad560-eea2-443c-98e9-1a66447dae86"

interface LeadFlowProps {
  formId?: string
}

export function LeadFlow({ formId }: LeadFlowProps = {}) {
  const effectiveFormId = formId || MAIN_FORM_ID
  const [step, setStep] = useState<FlowStep>("url")
  const [url, setUrl] = useState("")
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
          onSubmit={(submittedUrl) => {
            setUrl(submittedUrl)
            setStep("loading")
          }}
        />
      )}
      {step === "loading" && (
        <LoadingStep
          url={url}
          formId={effectiveFormId}
          onComplete={(generatedResult) => {
            setResult(generatedResult)
            setStep("result")
          }}
        />
      )}
      {step === "result" && (
        <ResultStep url={url} formId={effectiveFormId} result={result} onSuccess={() => setStep("success")} />
      )}
      {step === "success" && (
        <SuccessStep
          result={result}
          onRestart={() => {
            setUrl("")
            setResult({ type: "text", text: "", imageUrl: "" })
            setStep("url")
          }}
        />
      )}
    </div>
  )
}
