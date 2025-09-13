'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OverviewDashboard } from './dashboards/OverviewDashboard'
import { AnalyticsDashboard } from './dashboards/AnalyticsDashboard'
import { AIConsole } from './dashboards/AIConsole'
import { ContactsDashboard } from './dashboards/ContactsDashboard'
import { ThreadsDashboard } from './dashboards/ThreadsDashboard'
import { ReportsDashboard } from './dashboards/ReportsDashboard'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Monitor your email performance, AI insights, and team productivity
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="threads">Threads</TabsTrigger>
          <TabsTrigger value="ai">AI Console</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewDashboard />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <ContactsDashboard />
        </TabsContent>

        <TabsContent value="threads" className="mt-6">
          <ThreadsDashboard />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIConsole />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
