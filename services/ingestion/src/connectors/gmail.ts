import { google } from 'googleapis'
import { createLogger } from '../utils/logger'
import { EmailMessage, EmailThread } from '@taskforce/shared-types'
import crypto from 'crypto'

export interface GmailCredentials {
  accessToken: string
  refreshToken?: string
  tokenExpiry?: number
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body: {
      data?: string
      attachmentId?: string
    }
    parts?: Array<{
      mimeType: string
      body: { data?: string; attachmentId?: string }
      headers?: Array<{ name: string; value: string }>
    }>
  }
  sizeEstimate: number
  historyId: string
  internalDate: string
}

export class GmailConnector {
  private logger = createLogger('gmail-connector')
  private oauth2Client: any
  private gmail: any

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
  }

  async initializeWithCredentials(credentials: GmailCredentials): Promise<void> {
    try {
      this.oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expiry_date: credentials.tokenExpiry
      })

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })

      // Test the connection
      const profile = await this.gmail.users.getProfile({ userId: 'me' })
      this.logger.info('Gmail connection initialized', { 
        emailAddress: profile.data.emailAddress 
      })

    } catch (error) {
      this.logger.error('Failed to initialize Gmail connection', { error })
      throw new Error('Gmail authentication failed')
    }
  }

  async getProfile(): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number }> {
    try {
      const profile = await this.gmail.users.getProfile({ userId: 'me' })
      return {
        emailAddress: profile.data.emailAddress,
        messagesTotal: parseInt(profile.data.messagesTotal),
        threadsTotal: parseInt(profile.data.threadsTotal)
      }
    } catch (error) {
      this.logger.error('Failed to get Gmail profile', { error })
      throw error
    }
  }

  async listMessages(options: {
    maxResults?: number
    pageToken?: string
    q?: string
    labelIds?: string[]
    includeSpamTrash?: boolean
  } = {}): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: options.maxResults || 100,
        pageToken: options.pageToken,
        q: options.q,
        labelIds: options.labelIds,
        includeSpamTrash: options.includeSpamTrash || false
      })

      const messages = response.data.messages || []
      const nextPageToken = response.data.nextPageToken

      this.logger.debug('Listed Gmail messages', { 
        count: messages.length,
        nextPageToken: !!nextPageToken
      })

      return { messages, nextPageToken }

    } catch (error) {
      this.logger.error('Failed to list Gmail messages', { error })
      throw error
    }
  }

  async getMessage(messageId: string): Promise<GmailMessage> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      })

      return response.data

    } catch (error) {
      this.logger.error('Failed to get Gmail message', { messageId, error })
      throw error
    }
  }

  async getMessagesDetails(messageIds: string[]): Promise<GmailMessage[]> {
    try {
      // Process in batches to avoid rate limits
      const batchSize = 10
      const batches = []
      
      for (let i = 0; i < messageIds.length; i += batchSize) {
        batches.push(messageIds.slice(i, i + batchSize))
      }

      const allMessages: GmailMessage[] = []

      for (const batch of batches) {
        const batchPromises = batch.map(id => this.getMessage(id))
        const batchMessages = await Promise.all(batchPromises)
        allMessages.push(...batchMessages)

        // Add delay between batches to respect rate limits
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      this.logger.debug('Retrieved Gmail messages details', { 
        totalMessages: allMessages.length 
      })

      return allMessages

    } catch (error) {
      this.logger.error('Failed to get Gmail messages details', { error })
      throw error
    }
  }

  async listThreads(options: {
    maxResults?: number
    pageToken?: string
    q?: string
    labelIds?: string[]
    includeSpamTrash?: boolean
  } = {}): Promise<{ threads: Array<{ id: string }>; nextPageToken?: string }> {
    try {
      const response = await this.gmail.users.threads.list({
        userId: 'me',
        maxResults: options.maxResults || 100,
        pageToken: options.pageToken,
        q: options.q,
        labelIds: options.labelIds,
        includeSpamTrash: options.includeSpamTrash || false
      })

      const threads = response.data.threads || []
      const nextPageToken = response.data.nextPageToken

      this.logger.debug('Listed Gmail threads', { 
        count: threads.length,
        nextPageToken: !!nextPageToken
      })

      return { threads, nextPageToken }

    } catch (error) {
      this.logger.error('Failed to list Gmail threads', { error })
      throw error
    }
  }

  async getThread(threadId: string): Promise<any> {
    try {
      const response = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full'
      })

      return response.data

    } catch (error) {
      this.logger.error('Failed to get Gmail thread', { threadId, error })
      throw error
    }
  }

  async getLabels(): Promise<Array<{ id: string; name: string; type: string }>> {
    try {
      const response = await this.gmail.users.labels.list({ userId: 'me' })
      
      return response.data.labels.map((label: any) => ({
        id: label.id,
        name: label.name,
        type: label.type
      }))

    } catch (error) {
      this.logger.error('Failed to get Gmail labels', { error })
      throw error
    }
  }

  async refreshAccessToken(): Promise<{ accessToken: string; expiryDate: number }> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      
      this.oauth2Client.setCredentials(credentials)
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })

      this.logger.info('Gmail access token refreshed')

      return {
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date
      }

    } catch (error) {
      this.logger.error('Failed to refresh Gmail access token', { error })
      throw new Error('Token refresh failed')
    }
  }

  // Utility methods for parsing Gmail messages
  parseGmailMessage(gmailMessage: GmailMessage): EmailMessage {
    const headers = gmailMessage.payload.headers
    const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''

    const fromEmail = this.parseEmailAddress(getHeader('from'))
    const toEmails = this.parseEmailAddresses(getHeader('to'))
    const ccEmails = this.parseEmailAddresses(getHeader('cc'))
    const bccEmails = this.parseEmailAddresses(getHeader('bcc'))

    const timestamp = new Date(parseInt(gmailMessage.internalDate))
    const hasAttachments = this.hasAttachments(gmailMessage.payload)
    const attachmentCount = this.countAttachments(gmailMessage.payload)

    return {
      id: gmailMessage.id,
      messageId: gmailMessage.id,
      threadId: gmailMessage.threadId,
      subject: getHeader('subject'),
      from: {
        email: fromEmail.email,
        name: fromEmail.name
      },
      to: toEmails,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      bcc: bccEmails.length > 0 ? bccEmails : undefined,
      timestamp,
      isRead: !gmailMessage.labelIds.includes('UNREAD'),
      isSent: gmailMessage.labelIds.includes('SENT'),
      hasAttachments,
      attachmentCount,
      labels: gmailMessage.labelIds,
      bodyLength: this.calculateBodyLength(gmailMessage),
      priority: 'medium' as const,
      category: undefined
    }
  }

  private parseEmailAddress(emailString: string): { email: string; name?: string } {
    if (!emailString) return { email: '' }

    const match = emailString.match(/^(.*?)\s*<(.+?)>$/)
    if (match) {
      return {
        name: match[1].trim().replace(/^["']|["']$/g, ''),
        email: match[2].trim()
      }
    }

    return { email: emailString.trim() }
  }

  private parseEmailAddresses(emailString: string): Array<{ email: string; name?: string }> {
    if (!emailString) return []

    return emailString.split(',').map(email => this.parseEmailAddress(email.trim()))
  }

  private hasAttachments(payload: any): boolean {
    if (payload.parts) {
      return payload.parts.some((part: any) => 
        part.filename || 
        part.body.attachmentId ||
        (part.mimeType && !part.mimeType.startsWith('text/'))
      )
    }

    return !!(payload.filename || payload.body.attachmentId)
  }

  private countAttachments(payload: any): number {
    if (!payload.parts) return payload.body.attachmentId ? 1 : 0

    return payload.parts.reduce((count: number, part: any) => {
      if (part.filename || part.body.attachmentId) {
        return count + 1
      }
      return count
    }, 0)
  }

  private calculateBodyLength(gmailMessage: GmailMessage): number {
    // Gmail provides sizeEstimate which is close to the actual body length
    // We'll use a simplified calculation
    return gmailMessage.snippet.length + (gmailMessage.sizeEstimate || 0)
  }

  async getRecentMessages(days: number = 7): Promise<EmailMessage[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      const query = `after:${Math.floor(cutoffDate.getTime() / 1000)}`

      const { messages } = await this.listMessages({ q: query, maxResults: 1000 })
      
      if (messages.length === 0) {
        return []
      }

      const messageIds = messages.map(m => m.id)
      const gmailMessages = await this.getMessagesDetails(messageIds)

      const emailMessages = gmailMessages.map(gmailMsg => this.parseGmailMessage(gmailMsg))

      this.logger.info('Retrieved recent Gmail messages', { 
        count: emailMessages.length,
        days 
      })

      return emailMessages

    } catch (error) {
      this.logger.error('Failed to get recent Gmail messages', { error })
      throw error
    }
  }

  async getMessageHistory(historyId: string): Promise<{ historyId: string; messages: EmailMessage[] }> {
    try {
      const response = await this.gmail.users.history.list({
        userId: 'me',
        startHistoryId: historyId,
        historyTypes: ['messageAdded', 'messageDeleted']
      })

      const history = response.data.history || []
      const allMessages: EmailMessage[] = []

      for (const historyItem of history) {
        if (historyItem.messagesAdded) {
          for (const messageAdded of historyItem.messagesAdded) {
            const gmailMessage = await this.getMessage(messageAdded.message.id)
            allMessages.push(this.parseGmailMessage(gmailMessage))
          }
        }
      }

      const latestHistoryId = response.data.historyId

      this.logger.debug('Retrieved Gmail message history', { 
        historyId: latestHistoryId,
        messageCount: allMessages.length 
      })

      return {
        historyId: latestHistoryId,
        messages: allMessages
      }

    } catch (error) {
      this.logger.error('Failed to get Gmail message history', { error })
      throw error
    }
  }
}
