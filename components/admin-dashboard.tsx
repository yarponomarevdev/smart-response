"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LeadsTable } from "./leads-table"
import { ContentEditor } from "./content-editor"
import { AdminHeader } from "./admin-header"

export function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage leads and customize content</p>
        </div>

        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-4">
            <LeadsTable />
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <ContentEditor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
