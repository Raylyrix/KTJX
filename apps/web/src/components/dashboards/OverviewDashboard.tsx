'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Mail, 
  MailOpen, 
  Clock, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Brain,
  Zap,
  RefreshCw
} from 'lucide-react'
import { VolumeChart } from '@/components/charts/VolumeChart'
import { ResponseTimeChart } from '@/components/charts/ResponseTimeChart'
import { ContactHealthChart } from '@/components/charts/ContactHealthChart'
import { SentimentChart } from '@/components/charts/SentimentChart'
import { formatNumber, formatDuration, formatPercentage } from '@/lib/utils'

// Mock data - in real app, this would come from API
const mockOverviewData = {
  metrics: {
    totalSent: 15420,
    totalReceived: 12850,
    avgResponseTime: 245, // minutes
    activeContacts: 340,
    responseRate: 87.5,
    sentimentScore: 0.2
  },
  trends: {
    sentChange: 12.5,
    receivedChange: -3.2,
    responseTimeChange: -15.8,
    contactsChange: 8.3
  },
  recentActivity: [
    { type: 'sync', message: 'Gmail sync completed', time: '2 minutes ago', status: 'success' },
    { type: 'ai', message: 'AI insights generated', time: '15 minutes ago', status: 'success' },
    { type: 'alert', message: 'High response time detected', time: '1 hour ago', status: 'warning' },
    { type: 'sync', message: 'Outlook sync failed', time: '2 hours ago', status: 'error' }
  ]
}

export function OverviewDashboard() {
  const [data, setData] = useState(mockOverviewData)
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    format = 'number',
    description 
  }: {
    title: string
    value: number
    change: number
    icon: any
    format?: 'number' | 'duration' | 'percentage'
    description?: string
  }) => {
    const formatValue = () => {
      switch (format) {
        case 'duration': return formatDuration(value)
        case 'percentage': return formatPercentage(value)
        default: return formatNumber(value)
      }
    }

    const isPositive = change >= 0
    const isResponseTime = title.includes('Response Time')

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatValue()}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {isResponseTime ? (
              isPositive ? <TrendingUp className="h-3 w-3 text-red-500 mr-1" /> : <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              isPositive ? <TrendingUp className="h-3 w-3 text-green-500 mr-1" /> : <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={isResponseTime ? (isPositive ? 'text-red-500' : 'text-green-500') : (isPositive ? 'text-green-500' : 'text-red-500')}>
              {Math.abs(change)}%
            </span>
            <span className="ml-1">from last week</span>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dashboard Overview</h2>
          <p className="text-sm text-muted-foreground">
            Real-time insights into your email performance and team productivity
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Emails Sent"
          value={data.metrics.totalSent}
          change={data.trends.sentChange}
          icon={Mail}
          description="This week"
        />
        <MetricCard
          title="Emails Received"
          value={data.metrics.totalReceived}
          change={data.trends.receivedChange}
          icon={MailOpen}
          description="This week"
        />
        <MetricCard
          title="Avg Response Time"
          value={data.metrics.avgResponseTime}
          change={data.trends.responseTimeChange}
          icon={Clock}
          format="duration"
          description="Time to first response"
        />
        <MetricCard
          title="Response Rate"
          value={data.metrics.responseRate}
          change={data.trends.contactsChange}
          icon={Users}
          format="percentage"
          description="Emails responded to"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Volume Trends</CardTitle>
            <CardDescription>Daily sent and received emails over the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <VolumeChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time Distribution</CardTitle>
            <CardDescription>How quickly your team responds to emails</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponseTimeChart />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Health</CardTitle>
            <CardDescription>Engagement levels of your key contacts</CardDescription>
          </CardHeader>
          <CardContent>
            <ContactHealthChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Sentiment</CardTitle>
            <CardDescription>AI-analyzed tone of your email communications</CardDescription>
          </CardHeader>
          <CardContent>
            <SentimentChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`h-2 w-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.message}
                  </p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
                {activity.type === 'ai' && (
                  <Brain className="h-4 w-4 text-blue-500" />
                )}
                {activity.type === 'sync' && (
                  <Activity className="h-4 w-4 text-green-500" />
                )}
                {activity.type === 'alert' && (
                  <Zap className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <Brain className="h-5 w-5 mr-2" />
            AI Insights
          </CardTitle>
          <CardDescription className="text-blue-700">
            Intelligent recommendations based on your email patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-gray-900">
                🎯 Response Time Optimization
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Your team responds fastest to emails received between 9-11 AM. Consider scheduling important communications during this window.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-gray-900">
                📈 Contact Engagement
              </p>
              <p className="text-xs text-gray-600 mt-1">
                15% of your contacts haven't responded to emails in the last 7 days. Consider follow-up strategies for these relationships.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-gray-900">
                ⚡ Workload Balance
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Email volume is 23% higher than usual this week. Consider distributing workload more evenly across team members.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
