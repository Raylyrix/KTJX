import { Router, Request, Response } from 'express'
import { createLogger } from '../utils/logger'
import { OpenRouterClient } from '../services/openrouter'
import { RedisService } from '../services/redis'

const logger = createLogger('health-routes')
const router = Router()

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
        openrouter: false,
        redis: false
      }
    }

    // Check OpenRouter service
    try {
      const openRouterClient = new OpenRouterClient()
      health.services.openrouter = await openRouterClient.healthCheck()
    } catch (error) {
      logger.warn('OpenRouter health check failed', { error: error.message })
    }

    // Check Redis service
    try {
      const redisService = new RedisService()
      health.services.redis = await redisService.ping()
    } catch (error) {
      logger.warn('Redis health check failed', { error: error.message })
    }

    const isHealthy = health.services.openrouter && health.services.redis
    
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

export { router as healthRoutes }
