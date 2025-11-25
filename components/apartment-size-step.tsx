"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

interface ApartmentSizeStepProps {
  onSubmit: (size: number) => void
}

export function ApartmentSizeStep({ onSubmit }: ApartmentSizeStepProps) {
  const [size, setSize] = useState("")
  const [isValid, setIsValid] = useState(false)
  const [content, setContent] = useState({
    title: "What is your apartment size?",
    description: "Enter your apartment size in square meters to get personalized recommendations",
  })

  useEffect(() => {
    const fetchContent = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("content")
        .select("value")
        .in("key", ["apartment_size_title", "apartment_size_description"])

      if (data && data.length >= 2) {
        setContent({
          title: data[0]?.value.text || content.title,
          description: data[1]?.value.text || content.description,
        })
      }
    }

    fetchContent()
  }, [])

  const handleChange = (value: string) => {
    setSize(value)
    const numValue = Number.parseInt(value)
    setIsValid(!isNaN(numValue) && numValue > 0 && numValue < 10000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) {
      onSubmit(Number.parseInt(size))
    }
  }

  return (
    <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">{content.title}</h2>
        <p className="text-lg text-muted-foreground max-w-md">{content.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div className="relative">
          <Input
            type="number"
            placeholder="50"
            value={size}
            onChange={(e) => handleChange(e.target.value)}
            className="h-14 text-lg px-6 bg-card border-border"
            min="1"
            max="9999"
          />
          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground">m²</span>
        </div>
        <Button type="submit" disabled={!isValid} className="w-full h-14 text-lg font-semibold">
          Continue
        </Button>
      </form>
    </div>
  )
}
