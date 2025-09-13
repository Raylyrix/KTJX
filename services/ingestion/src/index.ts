import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { createLogger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rateLimit'
import { ingestionRoutes } from './routes/ingestion'
import { healthRoutes } from './routes/health'
import { validateEnv } from './utils/env'
import { RedisService } from './services/redis'
import { IngestionService } from './services/ingestion'
import { QueueService } from './services/queue'
import * as cron from 'node-cron'

// Load environment variables
dotenv.config()

// Validate required environment variables
validateEnv()

const logger = createLogger('ingestion-service')
const app = express()
const port = process.env.PORT || 4002

// Initialize services
const prisma = new PrismaClient()
const redisService = new RedisService()
const queueService = new QueueService(redisService)
const ingestionService = new IngestionService(prisma, queueService)

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting
app.use(rateLimitMiddleware)

// Routes
app.use('/health', healthRoutes)
app.use('/api/v1/ingestion', authMiddleware, ingestionRoutes(ingestionService))

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  })
})

// Background job processing
async function startBackgroundJobs(): Promise<void> {
  try {
    // Start queue worker
    await queueService.startWorker()

    // Schedule periodic sync jobs
    // Every hour: incremental sync for all active mailboxes
    cron.schedule('0 * * * *', async () => {
      logger.info('Running hourly incremental sync')
      try {
        await ingestionService.syncAllActiveMailboxes('incremental')
      } catch (error) {
        logger.error('Hourly sync failed:', error)
      }
    })

    // Every 6 hours: full sync for mailboxes that need it
    cron.schedule('0 */6 * * *', async () => {
      logger.info('Running 6-hourly full sync')
      try {
        await ingestionService.syncAllActiveMailboxes('full')
      } catch (error) {
        logger.error('6-hourly sync failed:', error)
      }
    })

    // Daily at 2 AM: deep sync and cleanup
    cron.schedule('0 2 * * *', async () => {
      logger.info('Running daily deep sync and cleanup')
      try {
        await ingestionService.performDailyCleanup()
      } catch (error) {
        logger.error('Daily cleanup failed:', error)
      }
    })

    logger.info('Background jobs started')

  } catch (error) {
    logger.error('Failed to start background jobs:', error)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await queueService.stopWorker()
  await redisService.disconnect()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await queueService.stopWorker()
  await redisService.disconnect()
  await prisma.$disconnect()
  process.exit(0)
})

// Start server
app.listen(port, async () => {
  try {
    // Test database connection
    await prisma.$connect()
    logger.info('Connected to PostgreSQL database')
    
    // Test Redis connection
    await redisService.connect()
    logger.info('Connected to Redis')
    
    // Start background jobs
    await startBackgroundJobs()
    
    logger.info(`Ingestion service running on port ${port}`)
    logger.info(`Environment: ${process.env.NODE_ENV}`)
    
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
})

export { app, ingestionService, queueService }
