"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Download } from "lucide-react"
import { Card } from "@/components/ui/card"

interface Lead {
  id: string
  url: string
  email: string
  result_text: string | null
  result_image_url: string | null
  status: string
  created_at: string
  form_id: string | null
}

export function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>("admin")

  useEffect(() => {
    fetchUserAndLeads()
  }, [])

  const fetchUserAndLeads = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
    const role = profile?.role || "admin"
    setUserRole(role)

    let query = supabase.from("leads").select("*").order("created_at", { ascending: false })

    if (role === "admin") {
      // Get user's form
      const { data: userForm } = await supabase.from("forms").select("id").eq("owner_id", user.id).single()
      if (userForm) {
        query = query.eq("form_id", userForm.id)
      }
    }

    const { data, error } = await query

    if (!error && data) {
      setLeads(data)
    }
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return

    const supabase = createClient()
    const { error } = await supabase.from("leads").delete().eq("id", id)

    if (!error) {
      setLeads(leads.filter((lead) => lead.id !== id))
    }
  }

  const handleExport = () => {
    const csv = [
      ["URL", "Email", "Status", "Created At", "Result"],
      ...leads.map((lead) => [
        lead.url,
        lead.email || "",
        lead.status,
        new Date(lead.created_at).toLocaleString(),
        lead.result_text || lead.result_image_url || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading leads...</div>
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Leads</h2>
          <p className="text-muted-foreground">
            {leads.length} total {userRole === "superadmin" ? "leads across all forms" : "leads"}
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" disabled={leads.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No leads yet
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium max-w-xs truncate">{lead.url}</TableCell>
                  <TableCell>{lead.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={lead.status === "completed" ? "default" : "outline"}>{lead.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {lead.result_image_url ? (
                      <a
                        href={lead.result_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        View Image
                      </a>
                    ) : lead.result_text ? (
                      <span className="text-xs">{lead.result_text.substring(0, 50)}...</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => handleDelete(lead.id)} variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
