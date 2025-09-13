import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createLogger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rateLimit'
import { aiRoutes } from './routes/ai'
import { healthRoutes } from './routes/health'
import { OpenRouterClient } from './services/openrouter'
import { AIService } from './services/ai'
import { RedisService } from './services/redis'
import { validateEnv } from './utils/env'

// Load environment variables
dotenv.config()

// Validate required environment variables
validateEnv()

const logger = createLogger('ai-service')
const app = express()
const port = process.env.PORT || 4001

// Initialize services
const redisService = new RedisService()
const openRouterClient = new OpenRouterClient()
const aiService = new AIService(openRouterClient, redisService)

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
app.use('/api/v1/ai', authMiddleware, aiRoutes(aiService))

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
  await redisService.disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await redisService.disconnect()
  process.exit(0)
})

// Start server
app.listen(port, () => {
  logger.info(`AI Service running on port ${port}`)
  logger.info(`Environment: ${process.env.NODE_ENV}`)
  logger.info(`OpenRouter Model: ${process.env.OPENROUTER_MODEL}`)
})

export { app, aiService }
