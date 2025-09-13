import { PrismaClient } from '@prisma/client'
import { RedisService } from './redis'
import { createLogger } from '../utils/logger'
import { startOfDay, subDays, format } from 'date-fns'

export class AggregationService {
  private logger = createLogger('aggregation-service')
  private intervalId: NodeJS.Timeout | null = null

  constructor(
    private prisma: PrismaClient,
    private redis: RedisService
  ) {}

  async startBackgroundJobs(): Promise<void> {
    // Run aggregation jobs every hour
    this.intervalId = setInterval(async () => {
      try {
        await this.runHourlyAggregations()
      } catch (error) {
        this.logger.error('Hourly aggregation failed:', error)
      }
    }, 60 * 60 * 1000) // 1 hour

    // Run initial aggregation
    await this.runHourlyAggregations()
    
    this.logger.info('Background aggregation jobs started')
  }

  async stopBackgroundJobs(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      this.logger.info('Background aggregation jobs stopped')
    }
  }

  async runHourlyAggregations(): Promise<void> {
    this.logger.info('Starting hourly aggregations')

    try {
      // Get all organizations
      const organizations = await this.prisma.organization.findMany({
        select: { id: true, name: true }
      })

      const today = startOfDay(new Date())
      const yesterday = subDays(today, 1)

      // Run aggregations for each organization
      for (const org of organizations) {
        await this.aggregateForOrganization(org.id, yesterday)
      }

      // Clear analytics cache
      await this.clearAnalyticsCache()

      this.logger.info('Hourly aggregations completed')

    } catch (error) {
      this.logger.error('Hourly aggregations failed:', error)
      throw error
    }
  }

  async aggregateForOrganization(organizationId: string, date: Date): Promise<void> {
    this.logger.debug('Aggregating data for organization', { organizationId, date })

    try {
      const startOfDate = startOfDay(date)
      const endOfDate = new Date(startOfDate.getTime() + 24 * 60 * 60 * 1000 - 1)

      // Get all mailboxes for this organization
      const mailboxes = await this.prisma.mailbox.findMany({
        where: { organizationId },
        select: { id: true, userId: true }
      })

      // Aggregate for each mailbox
      for (const mailbox of mailboxes) {
        await this.aggregateForMailbox(mailbox.id, mailbox.userId, organizationId, startOfDate, endOfDate)
      }

      // Aggregate organization-wide metrics
      await this.aggregateOrganizationMetrics(organizationId, startOfDate, endOfDate)

    } catch (error) {
      this.logger.error('Failed to aggregate for organization', { organizationId, error })
      throw error
    }
  }

  async aggregateForMailbox(
    mailboxId: string, 
    userId: string, 
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<void> {
    try {
      const whereClause = {
        mailboxId,
        organizationId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }

      // Email volume aggregates
      const [sentCount, receivedCount] = await Promise.all([
        this.prisma.message.count({
          where: { ...whereClause, isSent: true }
        }),
        this.prisma.message.count({
          where: { ...whereClause, isSent: false }
        })
      ])

      // Response time aggregates
      const responseTimes = await this.getResponseTimeAggregates(mailboxId, startDate, endDate)

      // Contact engagement
      const contactEngagement = await this.getContactEngagementAggregates(mailboxId, startDate, endDate)

      // Sentiment analysis
      const sentimentAggregate = await this.getSentimentAggregate(mailboxId, startDate, endDate)

      // Priority distribution
      const priorityDistribution = await this.getPriorityDistribution(mailboxId, startDate, endDate)

      // Store aggregates
      const aggregates = [
        {
          type: 'EMAIL_VOLUME_SENT',
          date: startDate,
          value: sentCount,
          organizationId,
          userId,
          messageId: null
        },
        {
          type: 'EMAIL_VOLUME_RECEIVED',
          date: startDate,
          value: receivedCount,
          organizationId,
          userId,
          messageId: null
        },
        {
          type: 'RESPONSE_TIME_AVERAGE',
          date: startDate,
          value: responseTimes.average,
          organizationId,
          userId,
          messageId: null
        },
        {
          type: 'RESPONSE_TIME_MEDIAN',
          date: startDate,
          value: responseTimes.median,
          organizationId,
          userId,
          messageId: null
        },
        {
          type: 'RESPONSE_TIME_P90',
          date: startDate,
          value: responseTimes.p90,
          organizationId,
          userId,
          messageId: null
        },
        {
          type: 'CONTACT_ENGAGEMENT',
          date: startDate,
          value: contactEngagement,
          organizationId,
          userId,
          messageId: null
        },
        {
          type: 'SENTIMENT_AVERAGE',
          date: startDate,
          value: sentimentAggregate,
          organizationId,
          userId,
          messageId: null
        }
      ]

      // Upsert aggregates
      await Promise.all(aggregates.map(async (agg) => {
        await this.prisma.analyticsAggregate.upsert({
          where: {
            type_date_organizationId_userId: {
              type: agg.type as any,
              date: agg.date,
              organizationId: agg.organizationId,
              userId: agg.userId || ''
            }
          },
          update: { value: agg.value },
          create: agg as any
        })
      }))

      this.logger.debug('Mailbox aggregation completed', { mailboxId, userId })

    } catch (error) {
      this.logger.error('Failed to aggregate for mailbox', { mailboxId, error })
      throw error
    }
  }

  async aggregateOrganizationMetrics(organizationId: string, startDate: Date, endDate: Date): Promise<void> {
    try {
      const whereClause = {
        organizationId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }

      // Organization-wide metrics
      const [totalSent, totalReceived] = await Promise.all([
        this.prisma.message.count({
          where: { ...whereClause, isSent: true }
        }),
        this.prisma.message.count({
          where: { ...whereClause, isSent: false }
        })
      ])

      // Update contact records
      await this.updateContactMetrics(organizationId, startDate, endDate)

      // Update thread metrics
      await this.updateThreadMetrics(organizationId, startDate, endDate)

      this.logger.debug('Organization metrics aggregated', { organizationId })

    } catch (error) {
      this.logger.error('Failed to aggregate organization metrics', { organizationId, error })
      throw error
    }
  }

  private async getResponseTimeAggregates(mailboxId: string, startDate: Date, endDate: Date): Promise<{
    average: number
    median: number
    p90: number
  }> {
    // Get threads with response times
    const threads = await this.prisma.thread.findMany({
      where: {
        mailboxId,
        lastMessageAt: {
          gte: startDate,
          lte: endDate
        },
        responseTime: { not: null }
      },
      select: { responseTime: true }
    })

    const responseTimes = threads
      .map(t => t.responseTime)
      .filter(rt => rt !== null) as number[]

    if (responseTimes.length === 0) {
      return { average: 0, median: 0, p90: 0 }
    }

    // Calculate statistics
    const sorted = responseTimes.sort((a, b) => a - b)
    const average = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
    const median = sorted[Math.floor(sorted.length / 2)]
    const p90Index = Math.floor(sorted.length * 0.9)
    const p90 = sorted[p90Index] || 0

    return { average, median, p90 }
  }

  private async getContactEngagementAggregates(mailboxId: string, startDate: Date, endDate: Date): Promise<number> {
    // Calculate average response rate for contacts
    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId: (await this.prisma.mailbox.findUnique({
          where: { id: mailboxId },
          select: { organizationId: true }
        }))?.organizationId,
        lastContactAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: { responseRate: true }
    })

    if (contacts.length === 0) return 0

    const totalResponseRate = contacts.reduce((sum, contact) => sum + contact.responseRate, 0)
    return totalResponseRate / contacts.length
  }

  private async getSentimentAggregate(mailboxId: string, startDate: Date, endDate: Date): Promise<number> {
    const messages = await this.prisma.message.findMany({
      where: {
        mailboxId,
        timestamp: {
          gte: startDate,
          lte: endDate
        },
        sentiment: { not: null }
      },
      select: { sentiment: true }
    })

    if (messages.length === 0) return 0

    const totalSentiment = messages.reduce((sum, msg) => sum + (msg.sentiment || 0), 0)
    return totalSentiment / messages.length
  }

  private async getPriorityDistribution(mailboxId: string, startDate: Date, endDate: Date): Promise<number> {
    // Calculate priority distribution (simplified)
    const messages = await this.prisma.message.count({
      where: {
        mailboxId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const highPriorityMessages = await this.prisma.message.count({
      where: {
        mailboxId,
        timestamp: {
          gte: startDate,
          lte: endDate
        },
        priority: { in: ['HIGH', 'URGENT'] }
      }
    })

    return messages > 0 ? (highPriorityMessages / messages) * 100 : 0
  }

  private async updateContactMetrics(organizationId: string, startDate: Date, endDate: Date): Promise<void> {
    // Update contact statistics
    const contacts = await this.prisma.contact.findMany({
      where: { organizationId }
    })

    for (const contact of contacts) {
      const messageCount = await this.prisma.message.count({
        where: {
          organizationId,
          OR: [
            { fromEmail: contact.email },
            { toEmails: { has: contact.email } }
          ],
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        }
      })

      const responseCount = await this.prisma.message.count({
        where: {
          organizationId,
          fromEmail: contact.email,
          isSent: true,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        }
      })

      const responseRate = messageCount > 0 ? responseCount / messageCount : 0

      await this.prisma.contact.update({
        where: { id: contact.id },
        data: {
          messageCount: contact.messageCount + messageCount,
          responseRate,
          lastContactAt: endDate
        }
      })
    }
  }

  private async updateThreadMetrics(organizationId: string, startDate: Date, endDate: Date): Promise<void> {
    // Update thread statistics
    const threads = await this.prisma.thread.findMany({
      where: {
        organizationId,
        lastMessageAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    for (const thread of threads) {
      const messageCount = await this.prisma.message.count({
        where: {
          threadId: thread.id,
          organizationId
        }
      })

      // Calculate average response time for this thread
      const messages = await this.prisma.message.findMany({
        where: {
          threadId: thread.id,
          organizationId
        },
        select: { timestamp: true },
        orderBy: { timestamp: 'asc' }
      })

      let totalResponseTime = 0
      let responseCount = 0

      for (let i = 1; i < messages.length; i++) {
        const timeDiff = messages[i].timestamp.getTime() - messages[i - 1].timestamp.getTime()
        totalResponseTime += timeDiff / (1000 * 60) // Convert to minutes
        responseCount++
      }

      const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : null

      await this.prisma.thread.update({
        where: { id: thread.id },
        data: {
          messageCount,
          responseTime: avgResponseTime
        }
      })
    }
  }

  private async clearAnalyticsCache(): Promise<void> {
    try {
      const cacheKeys = await this.redis.keys('analytics:*')
      if (cacheKeys.length > 0) {
        await Promise.all(cacheKeys.map(key => this.redis.del(key)))
        this.logger.debug('Analytics cache cleared', { keyCount: cacheKeys.length })
      }
    } catch (error) {
      this.logger.error('Failed to clear analytics cache:', error)
    }
  }
}
