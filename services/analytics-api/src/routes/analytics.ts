import { Router, Request, Response } from 'express'
import { createLogger } from '../utils/logger'
import { asyncHandler } from '../middleware/errorHandler'
import { requireRole } from '../middleware/auth'
import { AnalyticsService } from '../services/analytics'
import { AnalyticsQuery } from '@taskforce/shared-types'
import { z } from 'zod'

const logger = createLogger('analytics-routes')

// Validation schemas
const analyticsQuerySchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  organizationId: z.string(),
  userId: z.string().optional(),
  mailboxId: z.string().optional(),
  filters: z.object({
    contacts: z.array(z.string()).optional(),
    domains: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    priorities: z.array(z.enum(['low', 'medium', 'high', 'urgent'])).optional(),
    hasAttachments: z.boolean().optional(),
    sentimentRange: z.object({
      min: z.number(),
      max: z.number()
    }).optional()
  }).optional()
})

export function analyticsRoutes(analyticsService: AnalyticsService): Router {
  const router = Router()

  // Get overview analytics
  router.get('/overview',
    requireRole(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      logger.info('Fetching overview analytics', { 
        organizationId: query.organizationId,
        userId: req.user?.id 
      })

      const analytics = await analyticsService.getOverviewAnalytics(query)

      res.json({
        success: true,
        data: analytics
      })
    })
  )

  // Get volume analytics
  router.get('/volume',
    requireRole(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      const volume = await analyticsService.getVolumeAnalytics(query)

      res.json({
        success: true,
        data: volume
      })
    })
  )

  // Get response time analytics
  router.get('/response-times',
    requireRole(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      const responseTime = await analyticsService.getResponseTimeAnalytics(query)

      res.json({
        success: true,
        data: responseTime
      })
    })
  )

  // Get contact analytics
  router.get('/contacts',
    requireRole(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      const contacts = await analyticsService.getContactAnalytics(query)

      res.json({
        success: true,
        data: contacts
      })
    })
  )

  // Get thread analytics
  router.get('/threads',
    requireRole(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      const threads = await analyticsService.getThreadAnalytics(query)

      res.json({
        success: true,
        data: threads
      })
    })
  )

  // Get sentiment analytics
  router.get('/sentiment',
    requireRole(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      const sentiment = await analyticsService.getSentimentAnalytics(query)

      res.json({
        success: true,
        data: sentiment
      })
    })
  )

  // Get priority analytics
  router.get('/priority',
    requireRole(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      const priority = await analyticsService.getPriorityAnalytics(query)

      res.json({
        success: true,
        data: priority
      })
    })
  )

  // Get attachment analytics
  router.get('/attachments',
    requireRole(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      const attachments = await analyticsService.getAttachmentAnalytics(query)

      res.json({
        success: true,
        data: attachments
      })
    })
  )

  // Get team analytics (for managers and admins)
  router.get('/team',
    requireRole(['MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      // Get team-wide analytics
      const teamAnalytics = await analyticsService.getTeamAnalytics(query)

      res.json({
        success: true,
        data: teamAnalytics
      })
    })
  )

  // Get insights and recommendations
  router.get('/insights',
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      const insights = await analyticsService.getInsights(query)

      res.json({
        success: true,
        data: insights
      })
    })
  )

  // Get forecast data
  router.get('/forecast',
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      const forecast = await analyticsService.getForecast(query)

      res.json({
        success: true,
        data: forecast
      })
    })
  )

  // Get anomalies
  router.get('/anomalies',
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const query = analyticsQuerySchema.parse({
        ...req.query,
        organizationId: req.user?.organizationId
      })

      const anomalies = await analyticsService.getAnomalies(query)

      res.json({
        success: true,
        data: anomalies
      })
    })
  )

  // Export analytics data
  router.post('/export',
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { format, dataType, query } = req.body

      if (!format || !dataType) {
        return res.status(400).json({
          success: false,
          error: 'Format and dataType are required'
        })
      }

      const validatedQuery = analyticsQuerySchema.parse({
        ...query,
        organizationId: req.user?.organizationId
      })

      const exportData = await analyticsService.exportData(validatedQuery, dataType, format)

      res.json({
        success: true,
        data: exportData
      })
    })
  )

  return router
}
