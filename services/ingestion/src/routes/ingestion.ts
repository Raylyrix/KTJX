import { Router, Request, Response } from 'express'
import { createLogger } from '../utils/logger'
import { asyncHandler } from '../middleware/errorHandler'
import { requireRole } from '../middleware/auth'
import { IngestionService } from '../services/ingestion'
import { QueueService } from '../services/queue'
import { z } from 'zod'

const logger = createLogger('ingestion-routes')

// Validation schemas
const addMailboxSchema = z.object({
  email: z.string().email(),
  credentials: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().optional(),
    tokenExpiry: z.number().optional()
  })
})

const syncMailboxSchema = z.object({
  mailboxId: z.string().min(1),
  syncType: z.enum(['incremental', 'full']).default('incremental')
})

const queueJobSchema = z.object({
  mailboxId: z.string().min(1),
  type: z.enum(['initial', 'incremental', 'full']),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
})

export function ingestionRoutes(ingestionService: IngestionService): Router {
  const router = Router()

  // Add Gmail mailbox
  router.post('/mailboxes',
    requireRole(['MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { email, credentials } = addMailboxSchema.parse(req.body)
      
      logger.info('Adding Gmail mailbox', { 
        email, 
        organizationId: req.user?.organizationId,
        userId: req.user?.id 
      })
      
      const result = await ingestionService.addMailbox(
        req.user!.organizationId,
        req.user!.id,
        email,
        credentials
      )
      
      res.status(201).json({
        success: true,
        data: result
      })
    })
  )

  // List mailboxes
  router.get('/mailboxes',
    requireRole(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('Listing mailboxes', { 
        organizationId: req.user?.organizationId,
        userId: req.user?.id 
      })
      
      // This would fetch mailboxes from the database
      // For now, return mock data
      const mailboxes = [
        {
          id: 'mailbox-1',
          email: 'demo@example.com',
          provider: 'GMAIL',
          isActive: true,
          lastSyncAt: new Date().toISOString(),
          messageCount: 1250,
          threadCount: 340
        }
      ]
      
      res.json({
        success: true,
        data: mailboxes
      })
    })
  )

  // Sync specific mailbox
  router.post('/mailboxes/:mailboxId/sync',
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { mailboxId } = req.params
      const { syncType } = syncMailboxSchema.parse(req.body)
      
      logger.info('Syncing mailbox', { 
        mailboxId, 
        syncType,
        organizationId: req.user?.organizationId 
      })
      
      const result = await ingestionService.syncMailbox(mailboxId, syncType)
      
      res.json({
        success: true,
        data: result
      })
    })
  )

  // Sync all active mailboxes
  router.post('/sync/all',
    requireRole(['MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { syncType } = syncMailboxSchema.parse(req.body)
      
      logger.info('Syncing all active mailboxes', { 
        syncType,
        organizationId: req.user?.organizationId 
      })
      
      await ingestionService.syncAllActiveMailboxes(syncType)
      
      res.json({
        success: true,
        message: 'Bulk sync initiated'
      })
    })
  )

  // Refresh mailbox token
  router.post('/mailboxes/:mailboxId/refresh-token',
    requireRole(['MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { mailboxId } = req.params
      
      logger.info('Refreshing mailbox token', { 
        mailboxId,
        organizationId: req.user?.organizationId 
      })
      
      const success = await ingestionService.refreshMailboxToken(mailboxId)
      
      res.json({
        success,
        message: success ? 'Token refreshed successfully' : 'Failed to refresh token'
      })
    })
  )

  // Queue job manually
  router.post('/jobs',
    requireRole(['MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { mailboxId, type, priority } = queueJobSchema.parse(req.body)
      
      logger.info('Adding manual job to queue', { 
        mailboxId, 
        type, 
        priority,
        organizationId: req.user?.organizationId 
      })
      
      // This would add a job to the queue
      // For now, simulate success
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      res.status(201).json({
        success: true,
        data: {
          jobId,
          status: 'queued',
          mailboxId,
          type,
          priority
        }
      })
    })
  )

  // Get queue status
  router.get('/queue/status',
    requireRole(['MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('Getting queue status', { 
        organizationId: req.user?.organizationId 
      })
      
      // Mock queue status
      const status = {
        waiting: 5,
        active: 2,
        completed: 150,
        failed: 3,
        delayed: 1
      }
      
      res.json({
        success: true,
        data: status
      })
    })
  )

  // Get failed jobs
  router.get('/queue/failed',
    requireRole(['MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('Getting failed jobs', { 
        organizationId: req.user?.organizationId 
      })
      
      // Mock failed jobs
      const failedJobs = [
        {
          id: 'job-failed-1',
          type: 'backfill',
          mailboxId: 'mailbox-1',
          error: 'Authentication failed',
          attempts: 3,
          createdAt: new Date().toISOString()
        }
      ]
      
      res.json({
        success: true,
        data: failedJobs
      })
    })
  )

  // Retry failed job
  router.post('/queue/jobs/:jobId/retry',
    requireRole(['MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { jobId } = req.params
      
      logger.info('Retrying failed job', { 
        jobId,
        organizationId: req.user?.organizationId 
      })
      
      // Mock retry success
      res.json({
        success: true,
        message: 'Job retry initiated'
      })
    })
  )

  // Get ingestion statistics
  router.get('/stats',
    requireRole(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('Getting ingestion statistics', { 
        organizationId: req.user?.organizationId 
      })
      
      // Mock statistics
      const stats = {
        totalMailboxes: 5,
        activeMailboxes: 4,
        inactiveMailboxes: 1,
        totalMessages: 15420,
        totalThreads: 3200,
        lastSyncAt: new Date().toISOString(),
        syncFrequency: 'hourly',
        averageSyncTime: '45 seconds',
        successRate: 98.5
      }
      
      res.json({
        success: true,
        data: stats
      })
    })
  )

  // Get sync history
  router.get('/sync/history',
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { limit = 50, offset = 0 } = req.query
      
      logger.info('Getting sync history', { 
        limit, 
        offset,
        organizationId: req.user?.organizationId 
      })
      
      // Mock sync history
      const history = Array.from({ length: Math.min(parseInt(limit as string), 50) }, (_, i) => ({
        id: `sync-${i + 1}`,
        mailboxId: `mailbox-${(i % 3) + 1}`,
        type: i % 3 === 0 ? 'full' : 'incremental',
        status: i % 10 === 0 ? 'failed' : 'completed',
        messagesProcessed: Math.floor(Math.random() * 1000),
        threadsProcessed: Math.floor(Math.random() * 100),
        duration: Math.floor(Math.random() * 300) + 10,
        startedAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - i * 60 * 60 * 1000 + Math.floor(Math.random() * 300) * 1000).toISOString()
      }))
      
      res.json({
        success: true,
        data: {
          history,
          pagination: {
            total: 150,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: parseInt(offset as string) + parseInt(limit as string) < 150
          }
        }
      })
    })
  )

  return router
}
