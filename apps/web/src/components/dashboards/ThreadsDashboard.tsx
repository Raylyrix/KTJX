'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ThreadsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Email Threads</h2>
        <p className="text-sm text-muted-foreground">
          Analyze conversation patterns and thread health
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Threads</CardTitle>
            <CardDescription>Ongoing conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Thread analysis coming soon...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thread Analytics</CardTitle>
            <CardDescription>Conversation metrics and patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Thread analytics coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
