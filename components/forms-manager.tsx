"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Users } from "lucide-react"

interface Form {
  id: string
  name: string
  is_active: boolean
  lead_count: number
  lead_limit: number
  created_at: string
  owner_id: string
  owner?: { email: string }
}

export function FormsManager() {
  const [forms, setForms] = useState<Form[]>([])
  const [userRole, setUserRole] = useState<string>("admin")
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserRole()
  }, [])

  const fetchUserRole = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      setUserId(user.id)
      const { data } = await supabase.from("users").select("role").eq("id", user.id).single()

      const role = data?.role || "admin"
      setUserRole(role)
      await fetchForms(user.id, role)
    }
    setLoading(false)
  }

  const fetchForms = async (uid: string, role: string) => {
    const supabase = createClient()

    let query = supabase.from("forms").select("*").order("created_at", { ascending: false })

    if (role === "admin") {
      query = query.eq("owner_id", uid)
    }

    const { data, error } = await query

    if (!error && data) {
      if (role === "superadmin") {
        const formsWithOwners = await Promise.all(
          data.map(async (form) => {
            const { data: owner } = await supabase.from("users").select("email").eq("id", form.owner_id).single()
            return { ...form, owner }
          }),
        )
        setForms(formsWithOwners)
      } else {
        setForms(data)
      }
    }
  }

  const copyFormLink = (formId: string) => {
    const link = `${window.location.origin}/form/${formId}`
    navigator.clipboard.writeText(link)
    alert("Form link copied to clipboard!")
  }

  const copyEmbedCode = (formId: string) => {
    const embedCode = `<iframe src="${window.location.origin}/form/${formId}" width="100%" height="600" frameborder="0"></iframe>`
    navigator.clipboard.writeText(embedCode)
    alert("Embed code copied to clipboard!")
  }

  if (loading) {
    return <div>Loading forms...</div>
  }

  const isSuperAdmin = userRole === "superadmin"

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Forms</h2>
          <p className="text-muted-foreground">
            {isSuperAdmin ? "View all user forms and statistics" : "Manage your form"}
          </p>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forms.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forms.reduce((acc, f) => acc + f.lead_count, 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Forms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forms.filter((f) => f.is_active).length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => (
          <Card key={form.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{form.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {isSuperAdmin && form.owner && <div className="text-xs mt-1">Owner: {form.owner.email}</div>}
                    Created {new Date(form.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant={form.is_active ? "default" : "secondary"}>
                  {form.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Leads:</span>
                <span className="font-medium">
                  {form.lead_count} / {form.lead_limit}
                </span>
              </div>

              {(form.owner_id === userId || !isSuperAdmin) && (
                <>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => copyFormLink(form.id)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Link
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(`/form/${form.id}`, "_blank")}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>

                  <Button size="sm" variant="secondary" className="w-full" onClick={() => copyEmbedCode(form.id)}>
                    Copy Embed Code
                  </Button>
                </>
              )}

              {isSuperAdmin && form.owner_id !== userId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => window.open(`/form/${form.id}`, "_blank")}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  View Form
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {forms.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {isSuperAdmin ? "No forms created yet" : "You don't have a form yet"}
            </p>
            {!isSuperAdmin && (
              <p className="text-xs text-muted-foreground">A test form will be created automatically on first login</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
