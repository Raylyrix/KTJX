import { PrismaClient } from '@prisma/client'
import { RedisService } from './redis'
import { createLogger } from '../utils/logger'
import { 
  EmailAnalytics, 
  TimeSeriesData, 
  ContactAnalytics, 
  ThreadAnalytics,
  SentimentAnalysis,
  PriorityDistribution,
  AttachmentAnalytics,
  AnalyticsQuery,
  AnalyticsFilters
} from '@taskforce/shared-types'
import { subDays, startOfDay, endOfDay, format, parseISO } from 'date-fns'

export class AnalyticsService {
  private logger = createLogger('analytics-service')

  constructor(
    private prisma: PrismaClient,
    private redis: RedisService
  ) {}

  async getOverviewAnalytics(query: AnalyticsQuery): Promise<EmailAnalytics> {
    const cacheKey = `analytics:overview:${this.generateCacheKey(query)}`
    
    // Try cache first
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      this.logger.debug('Serving overview analytics from cache', { query })
      return JSON.parse(cached)
    }

    try {
      const [
        volume,
        responseTime,
        contacts,
        threads,
        sentiment,
        priority,
        attachments
      ] = await Promise.all([
        this.getVolumeAnalytics(query),
        this.getResponseTimeAnalytics(query),
        this.getContactAnalytics(query),
        this.getThreadAnalytics(query),
        this.getSentimentAnalytics(query),
        this.getPriorityAnalytics(query),
        this.getAttachmentAnalytics(query)
      ])

      const analytics: EmailAnalytics = {
        volume,
        responseTime,
        contacts,
        threads,
        sentiment,
        priority,
        attachments
      }

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(analytics))

      this.logger.info('Overview analytics generated', { 
        organizationId: query.organizationId,
        dateRange: `${query.startDate.toISOString()} - ${query.endDate.toISOString()}`
      })

      return analytics

    } catch (error) {
      this.logger.error('Failed to generate overview analytics', { error, query })
      throw new Error('Failed to generate overview analytics')
    }
  }

  async getVolumeAnalytics(query: AnalyticsQuery): Promise<{
    sent: number
    received: number
    daily: TimeSeriesData[]
    weekly: TimeSeriesData[]
    monthly: TimeSeriesData[]
  }> {
    const whereClause = this.buildWhereClause(query)

    // Get total counts
    const [sentCount, receivedCount] = await Promise.all([
      this.prisma.message.count({
        where: {
          ...whereClause,
          isSent: true
        }
      }),
      this.prisma.message.count({
        where: {
          ...whereClause,
          isSent: false
        }
      })
    ])

    // Get daily data
    const dailyData = await this.getTimeSeriesData(query, 'day')
    
    // Get weekly data
    const weeklyData = await this.getTimeSeriesData(query, 'week')
    
    // Get monthly data
    const monthlyData = await this.getTimeSeriesData(query, 'month')

    return {
      sent: sentCount,
      received: receivedCount,
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData
    }
  }

  async getResponseTimeAnalytics(query: AnalyticsQuery): Promise<{
    average: number
    median: number
    p90: number
    p95: number
    distribution: Array<{ range: string; count: number; percentage: number }>
  }> {
    const whereClause = this.buildWhereClause(query)

    // Get response time aggregates from analytics_aggregates table
    const aggregates = await this.prisma.analyticsAggregate.findMany({
      where: {
        ...whereClause,
        type: {
          in: ['RESPONSE_TIME_AVERAGE', 'RESPONSE_TIME_MEDIAN', 'RESPONSE_TIME_P90']
        }
      },
      orderBy: { date: 'desc' },
      take: 1
    })

    const average = aggregates.find(a => a.type === 'RESPONSE_TIME_AVERAGE')?.value || 0
    const median = aggregates.find(a => a.type === 'RESPONSE_TIME_MEDIAN')?.value || 0
    const p90 = aggregates.find(a => a.type === 'RESPONSE_TIME_P90')?.value || 0

    // Calculate P95 (approximate from P90)
    const p95 = p90 * 1.2

    // Get response time distribution
    const distribution = await this.getResponseTimeDistribution(query)

    return {
      average,
      median,
      p90,
      p95,
      distribution
    }
  }

  async getContactAnalytics(query: AnalyticsQuery): Promise<ContactAnalytics[]> {
    const whereClause = this.buildWhereClause(query)

    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId: query.organizationId,
        lastContactAt: {
          gte: query.startDate,
          lte: query.endDate
        }
      },
      orderBy: { messageCount: 'desc' },
      take: 50 // Top 50 contacts
    })

    return contacts.map(contact => ({
      email: contact.email,
      name: contact.name || undefined,
      domain: contact.domain,
      messageCount: contact.messageCount,
      responseRate: contact.responseRate,
      avgResponseTime: contact.avgResponseTime || 0,
      lastContactAt: contact.lastContactAt || new Date(),
      healthScore: this.calculateContactHealthScore(contact)
    }))
  }

  async getThreadAnalytics(query: AnalyticsQuery): Promise<ThreadAnalytics[]> {
    const whereClause = this.buildWhereClause(query)

    const threads = await this.prisma.thread.findMany({
      where: {
        ...whereClause,
        lastMessageAt: {
          gte: query.startDate,
          lte: query.endDate
        }
      },
      include: {
        messages: {
          select: {
            fromEmail: true,
            toEmails: true
          }
        }
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100 // Recent 100 threads
    })

    return threads.map(thread => ({
      threadId: thread.threadId,
      subject: thread.subject,
      messageCount: thread.messageCount,
      avgResponseTime: thread.responseTime || 0,
      isResolved: thread.isResolved,
      lastMessageAt: thread.lastMessageAt,
      participants: this.extractThreadParticipants(thread.messages)
    }))
  }

  async getSentimentAnalytics(query: AnalyticsQuery): Promise<SentimentAnalysis> {
    const whereClause = this.buildWhereClause(query)

    // Get sentiment aggregates
    const sentimentAgg = await this.prisma.analyticsAggregate.findFirst({
      where: {
        ...whereClause,
        type: 'SENTIMENT_AVERAGE'
      },
      orderBy: { date: 'desc' }
    })

    const average = sentimentAgg?.value || 0

    // Get sentiment distribution
    const messages = await this.prisma.message.findMany({
      where: {
        ...whereClause,
        sentiment: { not: null }
      },
      select: { sentiment: true }
    })

    const distribution = {
      positive: messages.filter(m => (m.sentiment || 0) > 0.1).length,
      neutral: messages.filter(m => (m.sentiment || 0) >= -0.1 && (m.sentiment || 0) <= 0.1).length,
      negative: messages.filter(m => (m.sentiment || 0) < -0.1).length
    }

    // Get sentiment trends (daily averages)
    const trends = await this.getSentimentTrends(query)

    return {
      average,
      distribution,
      trends
    }
  }

  async getPriorityAnalytics(query: AnalyticsQuery): Promise<PriorityDistribution> {
    const whereClause = this.buildWhereClause(query)

    const priorityCounts = await this.prisma.message.groupBy({
      by: ['priority'],
      where: whereClause,
      _count: { priority: true }
    })

    const distribution = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    }

    priorityCounts.forEach(item => {
      distribution[item.priority.toLowerCase() as keyof PriorityDistribution] = item._count.priority
    })

    return distribution
  }

  async getAttachmentAnalytics(query: AnalyticsQuery): Promise<AttachmentAnalytics> {
    const whereClause = this.buildWhereClause(query)

    const [totalMessages, messagesWithAttachments] = await Promise.all([
      this.prisma.message.count({ where: whereClause }),
      this.prisma.message.count({
        where: {
          ...whereClause,
          hasAttachments: true
        }
      })
    ])

    const percentage = totalMessages > 0 ? (messagesWithAttachments / totalMessages) * 100 : 0

    // Get attachment types distribution (this would need to be enhanced with actual attachment type data)
    const byType = {
      'images': Math.floor(messagesWithAttachments * 0.4),
      'documents': Math.floor(messagesWithAttachments * 0.3),
      'spreadsheets': Math.floor(messagesWithAttachments * 0.2),
      'other': Math.floor(messagesWithAttachments * 0.1)
    }

    return {
      percentage,
      totalCount: messagesWithAttachments,
      byType
    }
  }

  private async getTimeSeriesData(query: AnalyticsQuery, period: 'day' | 'week' | 'month'): Promise<TimeSeriesData[]> {
    const whereClause = this.buildWhereClause(query)
    
    // This is a simplified implementation
    // In production, you'd want to use proper SQL date functions for grouping
    const messages = await this.prisma.message.findMany({
      where: whereClause,
      select: {
        timestamp: true,
        isSent: true
      },
      orderBy: { timestamp: 'asc' }
    })

    // Group by period (simplified)
    const grouped = new Map<string, { sent: number; received: number }>()
    
    messages.forEach(message => {
      const key = this.formatDateForPeriod(message.timestamp, period)
      if (!grouped.has(key)) {
        grouped.set(key, { sent: 0, received: 0 })
      }
      const data = grouped.get(key)!
      if (message.isSent) {
        data.sent++
      } else {
        data.received++
      }
    })

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      value: data.sent + data.received,
      label: `${data.sent} sent, ${data.received} received`
    }))
  }

  private async getResponseTimeDistribution(query: AnalyticsQuery): Promise<Array<{ range: string; count: number; percentage: number }>> {
    // Simplified response time distribution
    const ranges = [
      { range: '0-1 hour', min: 0, max: 60 },
      { range: '1-4 hours', min: 60, max: 240 },
      { range: '4-24 hours', min: 240, max: 1440 },
      { range: '1-3 days', min: 1440, max: 4320 },
      { range: '3+ days', min: 4320, max: Infinity }
    ]

    // This would need actual response time data from threads
    // For now, return mock distribution
    return ranges.map(range => ({
      ...range,
      count: Math.floor(Math.random() * 100),
      percentage: Math.floor(Math.random() * 30)
    }))
  }

  private async getSentimentTrends(query: AnalyticsQuery): Promise<TimeSeriesData[]> {
    // Simplified sentiment trends
    const days = []
    for (let i = 0; i < 30; i++) {
      const date = subDays(new Date(), i)
      days.push({
        date: format(date, 'yyyy-MM-dd'),
        value: (Math.random() - 0.5) * 2 // Random sentiment between -1 and 1
      })
    }
    return days.reverse()
  }

  private buildWhereClause(query: AnalyticsQuery) {
    const where: any = {
      organizationId: query.organizationId,
      timestamp: {
        gte: query.startDate,
        lte: query.endDate
      }
    }

    if (query.userId) {
      where.userId = query.userId
    }

    if (query.mailboxId) {
      where.mailboxId = query.mailboxId
    }

    if (query.filters) {
      if (query.filters.contacts?.length) {
        where.OR = query.filters.contacts.map(email => ({
          fromEmail: email,
          toEmails: { has: email }
        }))
      }

      if (query.filters.labels?.length) {
        where.labels = { hasSome: query.filters.labels }
      }

      if (query.filters.categories?.length) {
        where.category = { in: query.filters.categories }
      }

      if (query.filters.priorities?.length) {
        where.priority = { in: query.filters.priorities }
      }

      if (query.filters.hasAttachments !== undefined) {
        where.hasAttachments = query.filters.hasAttachments
      }

      if (query.filters.sentimentRange) {
        where.sentiment = {
          gte: query.filters.sentimentRange.min,
          lte: query.filters.sentimentRange.max
        }
      }
    }

    return where
  }

  private generateCacheKey(query: AnalyticsQuery): string {
    return `${query.organizationId}:${query.startDate.getTime()}:${query.endDate.getTime()}:${query.userId || 'all'}:${query.mailboxId || 'all'}`
  }

  private formatDateForPeriod(date: Date, period: 'day' | 'week' | 'month'): string {
    switch (period) {
      case 'day':
        return format(date, 'yyyy-MM-dd')
      case 'week':
        return format(date, 'yyyy-\'W\'ww')
      case 'month':
        return format(date, 'yyyy-MM')
      default:
        return format(date, 'yyyy-MM-dd')
    }
  }

  private calculateContactHealthScore(contact: any): number {
    // Calculate health score based on response rate and response time
    const responseRateScore = contact.responseRate * 50 // 0-50 points
    const responseTimeScore = contact.avgResponseTime ? 
      Math.max(0, 50 - (contact.avgResponseTime / 60)) : 0 // 0-50 points (faster = better)
    
    return Math.min(100, responseRateScore + responseTimeScore)
  }

  private extractThreadParticipants(messages: Array<{ fromEmail: string; toEmails: string[] }>): string[] {
    const participants = new Set<string>()
    
    messages.forEach(message => {
      participants.add(message.fromEmail)
      message.toEmails.forEach(email => participants.add(email))
    })
    
    return Array.from(participants)
  }
}
