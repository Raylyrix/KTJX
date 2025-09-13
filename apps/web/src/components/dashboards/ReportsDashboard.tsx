'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ReportsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Reports & Exports</h2>
        <p className="text-sm text-muted-foreground">
          Generate and schedule automated reports
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Reports</CardTitle>
            <CardDescription>Automated report generation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Report scheduling coming soon...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Export analytics data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Data export features coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
