import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { createLogger } from '../utils/logger'
import { RedisService } from '../services/redis'

const logger = createLogger('health-routes')
const router = Router()
const prisma = new PrismaClient()

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: false,
        redis: false
      },
      metrics: {
        organizations: 0,
        users: 0,
        messages: 0,
        mailboxes: 0
      }
    }

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`
      health.services.database = true

      // Get basic metrics
      const [orgCount, userCount, messageCount, mailboxCount] = await Promise.all([
        prisma.organization.count(),
        prisma.user.count(),
        prisma.message.count(),
        prisma.mailbox.count()
      ])

      health.metrics = {
        organizations: orgCount,
        users: userCount,
        messages: messageCount,
        mailboxes: mailboxCount
      }
    } catch (error) {
      logger.warn('Database health check failed', { error: error.message })
    }

    // Check Redis connection
    try {
      const redisService = new RedisService()
      health.services.redis = await redisService.ping()
    } catch (error) {
      logger.warn('Redis health check failed', { error: error.message })
    }

    const isHealthy = health.services.database && health.services.redis
    
    res.status(isHealthy ? 200 : 503).json(health)
  } catch (error) {
    logger.error('Health check failed', { error: error.message })
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    })
  }
})

// Readiness check
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`
    
    // Check Redis
    const redisService = new RedisService()
    const isRedisReady = await redisService.ping()
    
    if (!isRedisReady) {
      res.status(503).json({
        status: 'not ready',
        reason: 'Redis not available'
      })
      return
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message })
    res.status(503).json({
      status: 'not ready',
      reason: 'Service unavailable'
    })
  }
})

// Liveness check
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Database status
router.get('/database', async (req: Request, res: Response) => {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        version() as version,
        current_database() as database,
        current_user as user,
        now() as current_time
    `
    
    res.json({
      success: true,
      data: result[0]
    })
  } catch (error) {
    logger.error('Database status check failed', { error: error.message })
    res.status(503).json({
      success: false,
      error: 'Database not available'
    })
  }
})

// Redis status
router.get('/redis', async (req: Request, res: Response) => {
  try {
    const redisService = new RedisService()
    const ping = await redisService.ping()
    
    if (!ping) {
      return res.status(503).json({
        success: false,
        error: 'Redis not responding'
      })
    }

    res.json({
      success: true,
      data: {
        status: 'connected',
        ping: 'PONG'
      }
    })
  } catch (error) {
    logger.error('Redis status check failed', { error: error.message })
    res.status(503).json({
      success: false,
      error: 'Redis not available'
    })
  }
})

export { router as healthRoutes }
