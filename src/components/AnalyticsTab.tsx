import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  Mail, 
  Clock, 
  Users, 
  TrendingUp, 
  Brain,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle,
  MailOpen
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface AnalyticsData {
  totalSent: number
  totalReceived: number
  avgResponseTime: number
  activeContacts: number
  responseRate: number
  sentimentScore: number
}

interface ServiceStatus {
  analytics: boolean
  ai: boolean
  ingestion: boolean
}

interface AnalyticsTabProps {
  tabId: string
  gmailAccount: string | null
  isAuthenticated: boolean
  onTitleChange: (title: string) => void
}

export default function AnalyticsTab({ 
  tabId, 
  gmailAccount, 
  isAuthenticated, 
  onTitleChange 
}: AnalyticsTabProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    analytics: false,
    ai: false,
    ingestion: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [activeView, setActiveView] = useState('overview')

  useEffect(() => {
    if (isAuthenticated) {
      onTitleChange(`${gmailAccount} - Analytics`)
    } else {
      onTitleChange('Analytics Dashboard')
    }
  }, [isAuthenticated, gmailAccount, onTitleChange])

  useEffect(() => {
    checkServiceStatus()
    if (isAuthenticated) {
      loadAnalyticsData()
    }
  }, [isAuthenticated])

  const checkServiceStatus = async () => {
    try {
      // Check if analytics services are running
      const analyticsResponse = await fetch('http://localhost:4000/health')
      const aiResponse = await fetch('http://localhost:4001/health')
      const ingestionResponse = await fetch('http://localhost:4002/health')

      setServiceStatus({
        analytics: analyticsResponse.ok,
        ai: aiResponse.ok,
        ingestion: ingestionResponse.ok
      })
    } catch (error) {
      console.error('Error checking service status:', error)
      setServiceStatus({
        analytics: false,
        ai: false,
        ingestion: false
      })
    }
  }

  const loadAnalyticsData = async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    try {
      // Mock data for now - in real implementation, this would call the analytics API
      const mockData: AnalyticsData = {
        totalSent: 15420,
        totalReceived: 12850,
        avgResponseTime: 245, // minutes
        activeContacts: 340,
        responseRate: 87.5,
        sentimentScore: 0.2
      }

      setAnalyticsData(mockData)
      toast.success('Analytics data loaded successfully')
    } catch (error) {
      console.error('Error loading analytics data:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    await checkServiceStatus()
    if (isAuthenticated) {
      await loadAnalyticsData()
    }
  }

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description,
    trend 
  }: {
    title: string
    value: string | number
    icon: any
    description?: string
    trend?: { value: number; isPositive: boolean }
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendingUp className={`h-3 w-3 mr-1 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`} />
            <span className={trend.isPositive ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(trend.value)}%
            </span>
            <span className="ml-1">from last week</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Analytics Dashboard
            </CardTitle>
            <CardDescription>
              Connect your Gmail account to view email analytics and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Please authenticate with Gmail to access analytics features
                </p>
              </div>
              
              {/* Service Status */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Service Status</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Analytics API</span>
                    {serviceStatus.analytics ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>AI Service</span>
                    {serviceStatus.ai ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Ingestion Service</span>
                    {serviceStatus.ingestion ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                className="w-full"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Email Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Insights for {gmailAccount}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="ai">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Emails Sent"
                value={analyticsData?.totalSent.toLocaleString() || '0'}
                icon={Mail}
                trend={{ value: 12.5, isPositive: true }}
                description="This week"
              />
              <MetricCard
                title="Emails Received"
                value={analyticsData?.totalReceived.toLocaleString() || '0'}
                icon={MailOpen}
                trend={{ value: -3.2, isPositive: false }}
                description="This week"
              />
              <MetricCard
                title="Avg Response Time"
                value={`${Math.floor((analyticsData?.avgResponseTime || 0) / 60)}h ${(analyticsData?.avgResponseTime || 0) % 60}m`}
                icon={Clock}
                trend={{ value: -15.8, isPositive: true }}
                description="Time to first response"
              />
              <MetricCard
                title="Response Rate"
                value={`${analyticsData?.responseRate || 0}%`}
                icon={Users}
                trend={{ value: 8.3, isPositive: true }}
                description="Emails responded to"
              />
            </div>

            {/* Service Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Service Status
                </CardTitle>
                <CardDescription>
                  Real-time status of analytics services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className={`h-3 w-3 rounded-full ${serviceStatus.analytics ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium">Analytics API</p>
                      <p className="text-xs text-muted-foreground">
                        {serviceStatus.analytics ? 'Connected' : 'Disconnected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className={`h-3 w-3 rounded-full ${serviceStatus.ai ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium">AI Service</p>
                      <p className="text-xs text-muted-foreground">
                        {serviceStatus.ai ? 'Connected' : 'Disconnected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className={`h-3 w-3 rounded-full ${serviceStatus.ingestion ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium">Ingestion Service</p>
                      <p className="text-xs text-muted-foreground">
                        {serviceStatus.ingestion ? 'Connected' : 'Disconnected'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  Detailed performance metrics and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Advanced performance analytics coming soon...
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Analytics</CardTitle>
                <CardDescription>
                  Contact engagement and relationship insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Contact analytics coming soon...
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  AI Insights
                </CardTitle>
                <CardDescription>
                  AI-powered insights and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-sm mb-2">🎯 Response Time Optimization</h4>
                    <p className="text-xs text-muted-foreground">
                      Your team responds fastest to emails received between 9-11 AM. 
                      Consider scheduling important communications during this window.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-sm mb-2">📈 Contact Engagement</h4>
                    <p className="text-xs text-muted-foreground">
                      15% of your contacts haven't responded to emails in the last 7 days. 
                      Consider follow-up strategies for these relationships.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-sm mb-2">⚡ Workload Balance</h4>
                    <p className="text-xs text-muted-foreground">
                      Email volume is 23% higher than usual this week. 
                      Consider distributing workload more evenly across team members.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}