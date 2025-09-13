import { Request, Response, NextFunction } from 'express'
import { RedisService } from '../services/redis'
import { createLogger } from '../utils/logger'

const logger = createLogger('rate-limit-middleware')

// In-memory store for rate limiting (fallback when Redis is not available)
const memoryStore = new Map<string, { count: number; resetTime: number }>()

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  // For now, use a simple in-memory rate limiter
  // In production, this should use Redis for distributed rate limiting
  const clientId = req.ip || req.connection.remoteAddress || 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxRequests = 100 // 100 requests per 15 minutes

  const key = `rate_limit:${clientId}`
  const current = memoryStore.get(key)

  if (!current || now > current.resetTime) {
    // New window or expired window
    memoryStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    next()
    return
  }

  if (current.count >= maxRequests) {
    logger.warn('Rate limit exceeded', {
      clientId,
      count: current.count,
      limit: maxRequests,
      resetTime: new Date(current.resetTime).toISOString()
    })

    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${maxRequests} requests per 15 minutes`,
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    })
    return
  }

  // Increment counter
  current.count++
  memoryStore.set(key, current)

  // Add rate limit headers
  res.set({
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': (maxRequests - current.count).toString(),
    'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
  })

  next()
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of memoryStore.entries()) {
    if (now > value.resetTime) {
      memoryStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes
