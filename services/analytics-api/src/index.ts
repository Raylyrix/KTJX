import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { createLogger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rateLimit'
import { analyticsRoutes } from './routes/analytics'
import { healthRoutes } from './routes/health'
import { authRoutes } from './routes/auth'
import { validateEnv } from './utils/env'
import { RedisService } from './services/redis'
import { AnalyticsService } from './services/analytics'
import { AggregationService } from './services/aggregation'

// Load environment variables
dotenv.config()

// Validate required environment variables
validateEnv()

const logger = createLogger('analytics-api')
const app = express()
const port = process.env.PORT || 4000

// Initialize services
const prisma = new PrismaClient()
const redisService = new RedisService()
const analyticsService = new AnalyticsService(prisma, redisService)
const aggregationService = new AggregationService(prisma, redisService)

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
app.use('/auth', authRoutes)
app.use('/api/v1/analytics', authMiddleware, analyticsRoutes(analyticsService))

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

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  await redisService.disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await prisma.$disconnect()
  await redisService.disconnect()
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
    
    logger.info(`Analytics API running on port ${port}`)
    logger.info(`Environment: ${process.env.NODE_ENV}`)
    
    // Start background aggregation jobs
    await aggregationService.startBackgroundJobs()
    logger.info('Background aggregation jobs started')
    
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
})

export { app, analyticsService, aggregationService }
