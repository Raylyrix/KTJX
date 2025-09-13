import { PrismaClient } from '@prisma/client'
import { QueueService } from './queue'
import { GmailConnector, GmailCredentials } from '../connectors/gmail'
import { createLogger } from '../utils/logger'
import { EmailMessage, EmailThread } from '@taskforce/shared-types'
import crypto from 'crypto'

export class IngestionService {
  private logger = createLogger('ingestion-service')
  private gmailConnectors = new Map<string, GmailConnector>()

  constructor(
    private prisma: PrismaClient,
    private queueService: QueueService
  ) {}

  async addMailbox(
    organizationId: string,
    userId: string,
    email: string,
    credentials: GmailCredentials
  ): Promise<{ mailboxId: string; profile: any }> {
    try {
      // Initialize Gmail connector
      const connector = new GmailConnector()
      await connector.initializeWithCredentials(credentials)

      // Get Gmail profile
      const profile = await connector.getProfile()

      // Encrypt credentials
      const encryptedCredentials = this.encryptCredentials(credentials)

      // Create mailbox record
      const mailbox = await this.prisma.mailbox.create({
        data: {
          email: profile.emailAddress,
          provider: 'GMAIL',
          accessToken: encryptedCredentials.accessToken,
          refreshToken: encryptedCredentials.refreshToken,
          tokenExpiry: credentials.tokenExpiry ? new Date(credentials.tokenExpiry) : null,
          organizationId,
          userId,
          lastSyncAt: new Date()
        }
      })

      // Store connector for this mailbox
      this.gmailConnectors.set(mailbox.id, connector)

      // Queue initial backfill
      await this.queueService.addJob('backfill', {
        mailboxId: mailbox.id,
        type: 'initial',
        priority: 'high'
      })

      this.logger.info('Mailbox added successfully', {
        mailboxId: mailbox.id,
        email: profile.emailAddress,
        organizationId
      })

      return {
        mailboxId: mailbox.id,
        profile
      }

    } catch (error) {
      this.logger.error('Failed to add mailbox', { error, email, organizationId })
      throw new Error('Failed to add Gmail mailbox')
    }
  }

  async syncMailbox(
    mailboxId: string,
    syncType: 'incremental' | 'full' = 'incremental'
  ): Promise<{ messagesProcessed: number; threadsProcessed: number }> {
    try {
      const mailbox = await this.prisma.mailbox.findUnique({
        where: { id: mailboxId },
        include: { organization: true }
      })

      if (!mailbox) {
        throw new Error('Mailbox not found')
      }

      if (!mailbox.isActive) {
        this.logger.warn('Skipping sync for inactive mailbox', { mailboxId })
        return { messagesProcessed: 0, threadsProcessed: 0 }
      }

      // Get or create Gmail connector
      let connector = this.gmailConnectors.get(mailboxId)
      if (!connector) {
        const credentials = this.decryptCredentials({
          accessToken: mailbox.accessToken,
          refreshToken: mailbox.refreshToken,
          tokenExpiry: mailbox.tokenExpiry?.getTime()
        })

        connector = new GmailConnector()
        await connector.initializeWithCredentials(credentials)
        this.gmailConnectors.set(mailboxId, connector)
      }

      let messagesProcessed = 0
      let threadsProcessed = 0

      if (syncType === 'full') {
        // Full sync: get all messages from the last 30 days
        const messages = await connector.getRecentMessages(30)
        messagesProcessed = await this.processMessages(mailboxId, messages)
        threadsProcessed = await this.processThreads(mailboxId, messages)

      } else {
        // Incremental sync: get messages since last sync
        const lastSync = mailbox.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000)
        const daysSinceLastSync = Math.ceil((Date.now() - lastSync.getTime()) / (24 * 60 * 60 * 1000))
        
        const messages = await connector.getRecentMessages(Math.max(daysSinceLastSync, 1))
        messagesProcessed = await this.processMessages(mailboxId, messages)
        threadsProcessed = await this.processThreads(mailboxId, messages)
      }

      // Update last sync time
      await this.prisma.mailbox.update({
        where: { id: mailboxId },
        data: { lastSyncAt: new Date() }
      })

      this.logger.info('Mailbox sync completed', {
        mailboxId,
        syncType,
        messagesProcessed,
        threadsProcessed
      })

      return { messagesProcessed, threadsProcessed }

    } catch (error) {
      this.logger.error('Mailbox sync failed', { mailboxId, syncType, error })
      
      // If it's an auth error, mark mailbox as inactive
      if (error.message?.includes('auth') || error.message?.includes('token')) {
        await this.prisma.mailbox.update({
          where: { id: mailboxId },
          data: { isActive: false }
        })
      }

      throw error
    }
  }

  async syncAllActiveMailboxes(syncType: 'incremental' | 'full' = 'incremental'): Promise<void> {
    try {
      const activeMailboxes = await this.prisma.mailbox.findMany({
        where: { 
          isActive: true,
          provider: 'GMAIL'
        },
        select: { id: true, email: true, organizationId: true }
      })

      this.logger.info('Starting bulk sync for active mailboxes', {
        count: activeMailboxes.length,
        syncType
      })

      // Process mailboxes in parallel (with concurrency limit)
      const concurrency = 5
      for (let i = 0; i < activeMailboxes.length; i += concurrency) {
        const batch = activeMailboxes.slice(i, i + concurrency)
        
        await Promise.allSettled(
          batch.map(async (mailbox) => {
            try {
              await this.syncMailbox(mailbox.id, syncType)
            } catch (error) {
              this.logger.error('Batch sync failed for mailbox', {
                mailboxId: mailbox.id,
                error: error.message
              })
            }
          })
        )

        // Add delay between batches
        if (i + concurrency < activeMailboxes.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      this.logger.info('Bulk sync completed for all active mailboxes')

    } catch (error) {
      this.logger.error('Bulk sync failed', { error })
      throw error
    }
  }

  async processMessages(mailboxId: string, messages: EmailMessage[]): Promise<number> {
    let processed = 0

    for (const message of messages) {
      try {
        await this.prisma.message.upsert({
          where: {
            messageId_organizationId: {
              messageId: message.messageId,
              organizationId: (await this.prisma.mailbox.findUnique({
                where: { id: mailboxId },
                select: { organizationId: true }
              }))?.organizationId || ''
            }
          },
          update: {
            subject: message.subject,
            fromEmail: message.from.email,
            fromName: message.from.name,
            toEmails: message.to.map(t => t.email),
            ccEmails: message.cc?.map(c => c.email) || [],
            bccEmails: message.bcc?.map(b => b.email) || [],
            timestamp: message.timestamp,
            isRead: message.isRead,
            isSent: message.isSent,
            hasAttachments: message.hasAttachments,
            attachmentCount: message.attachmentCount,
            labels: message.labels,
            bodyLength: message.bodyLength,
            sentiment: message.sentiment,
            priority: message.priority,
            category: message.category,
            updatedAt: new Date()
          },
          create: {
            messageId: message.messageId,
            threadId: message.threadId,
            subject: message.subject,
            fromEmail: message.from.email,
            fromName: message.from.name,
            toEmails: message.to.map(t => t.email),
            ccEmails: message.cc?.map(c => c.email) || [],
            bccEmails: message.bcc?.map(b => b.email) || [],
            timestamp: message.timestamp,
            isRead: message.isRead,
            isSent: message.isSent,
            hasAttachments: message.hasAttachments,
            attachmentCount: message.attachmentCount,
            labels: message.labels,
            bodyLength: message.bodyLength,
            sentiment: message.sentiment,
            priority: message.priority,
            category: message.category,
            mailboxId,
            userId: (await this.prisma.mailbox.findUnique({
              where: { id: mailboxId },
              select: { userId: true }
            }))?.userId || '',
            organizationId: (await this.prisma.mailbox.findUnique({
              where: { id: mailboxId },
              select: { organizationId: true }
            }))?.organizationId || ''
          }
        })

        processed++

      } catch (error) {
        this.logger.error('Failed to process message', {
          messageId: message.messageId,
          error: error.message
        })
      }
    }

    return processed
  }

  async processThreads(mailboxId: string, messages: EmailMessage[]): Promise<number> {
    const threadMap = new Map<string, EmailMessage[]>()

    // Group messages by thread
    messages.forEach(message => {
      if (!threadMap.has(message.threadId)) {
        threadMap.set(message.threadId, [])
      }
      threadMap.get(message.threadId)!.push(message)
    })

    let processed = 0

    for (const [threadId, threadMessages] of threadMap) {
      try {
        const sortedMessages = threadMessages.sort((a, b) => 
          a.timestamp.getTime() - b.timestamp.getTime()
        )

        const firstMessage = sortedMessages[0]
        const lastMessage = sortedMessages[sortedMessages.length - 1]

        // Calculate response time (simplified)
        let responseTime = null
        if (sortedMessages.length > 1) {
          const totalTime = lastMessage.timestamp.getTime() - firstMessage.timestamp.getTime()
          responseTime = Math.floor(totalTime / (1000 * 60)) // minutes
        }

        await this.prisma.thread.upsert({
          where: {
            threadId_organizationId: {
              threadId,
              organizationId: (await this.prisma.mailbox.findUnique({
                where: { id: mailboxId },
                select: { organizationId: true }
              }))?.organizationId || ''
            }
          },
          update: {
            subject: firstMessage.subject,
            messageCount: threadMessages.length,
            lastMessageAt: lastMessage.timestamp,
            responseTime,
            isResolved: this.isThreadResolved(threadMessages),
            updatedAt: new Date()
          },
          create: {
            threadId,
            subject: firstMessage.subject,
            messageCount: threadMessages.length,
            lastMessageAt: lastMessage.timestamp,
            responseTime,
            isResolved: this.isThreadResolved(threadMessages),
            mailboxId,
            organizationId: (await this.prisma.mailbox.findUnique({
              where: { id: mailboxId },
              select: { organizationId: true }
            }))?.organizationId || ''
          }
        })

        processed++

      } catch (error) {
        this.logger.error('Failed to process thread', {
          threadId,
          error: error.message
        })
      }
    }

    return processed
  }

  async performDailyCleanup(): Promise<void> {
    try {
      // Clean up old inactive mailboxes (older than 30 days)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 30)

      const deletedMailboxes = await this.prisma.mailbox.deleteMany({
        where: {
          isActive: false,
          updatedAt: { lt: cutoffDate }
        }
      })

      // Clean up old analytics aggregates (keep only last 90 days)
      const analyticsCutoff = new Date()
      analyticsCutoff.setDate(analyticsCutoff.getDate() - 90)

      const deletedAggregates = await this.prisma.analyticsAggregate.deleteMany({
        where: {
          date: { lt: analyticsCutoff }
        }
      })

      this.logger.info('Daily cleanup completed', {
        deletedMailboxes: deletedMailboxes.count,
        deletedAggregates: deletedAggregates.count
      })

    } catch (error) {
      this.logger.error('Daily cleanup failed', { error })
    }
  }

  async refreshMailboxToken(mailboxId: string): Promise<boolean> {
    try {
      const connector = this.gmailConnectors.get(mailboxId)
      if (!connector) {
        throw new Error('Connector not found')
      }

      const newCredentials = await connector.refreshAccessToken()

      // Update mailbox with new token
      await this.prisma.mailbox.update({
        where: { id: mailboxId },
        data: {
          accessToken: this.encryptString(newCredentials.accessToken),
          tokenExpiry: new Date(newCredentials.expiryDate)
        }
      })

      this.logger.info('Mailbox token refreshed', { mailboxId })
      return true

    } catch (error) {
      this.logger.error('Failed to refresh mailbox token', { mailboxId, error })
      return false
    }
  }

  private isThreadResolved(messages: EmailMessage[]): boolean {
    // A thread is considered resolved if the last message was sent by the user
    // and it's been more than 24 hours since the last message
    const lastMessage = messages[messages.length - 1]
    const isLastMessageFromUser = lastMessage.isSent
    const timeSinceLastMessage = Date.now() - lastMessage.timestamp.getTime()
    const isOldEnough = timeSinceLastMessage > 24 * 60 * 60 * 1000 // 24 hours

    return isLastMessageFromUser && isOldEnough
  }

  private encryptCredentials(credentials: GmailCredentials): GmailCredentials {
    return {
      accessToken: this.encryptString(credentials.accessToken),
      refreshToken: credentials.refreshToken ? this.encryptString(credentials.refreshToken) : undefined,
      tokenExpiry: credentials.tokenExpiry
    }
  }

  private decryptCredentials(encryptedCredentials: GmailCredentials): GmailCredentials {
    return {
      accessToken: this.decryptString(encryptedCredentials.accessToken),
      refreshToken: encryptedCredentials.refreshToken ? this.decryptString(encryptedCredentials.refreshToken) : undefined,
      tokenExpiry: encryptedCredentials.tokenExpiry
    }
  }

  private encryptString(text: string): string {
    const algorithm = 'aes-256-gcm'
    const key = Buffer.from(process.env.ENCRYPTION_KEY!.substring(0, 32), 'utf8')
    const iv = crypto.randomBytes(16)
    
    const cipher = crypto.createCipher(algorithm, key)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return iv.toString('hex') + ':' + encrypted
  }

  private decryptString(encryptedText: string): string {
    const algorithm = 'aes-256-gcm'
    const key = Buffer.from(process.env.ENCRYPTION_KEY!.substring(0, 32), 'utf8')
    
    const parts = encryptedText.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const decipher = crypto.createDecipher(algorithm, key)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
}
