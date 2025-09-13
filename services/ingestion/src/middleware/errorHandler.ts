import { Request, Response, NextFunction } from 'express'
import { createLogger } from '../utils/logger'

const logger = createLogger('error-handler')

export interface ApiError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export function errorHandler(
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Default error response
  let statusCode = error.statusCode || 500
  let message = error.message || 'Internal server error'
  let isOperational = error.isOperational || false

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation error'
    isOperational = true
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401
    message = 'Unauthorized'
    isOperational = true
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403
    message = 'Forbidden'
    isOperational = true
  } else if (error.name === 'NotFoundError') {
    statusCode = 404
    message = 'Not found'
    isOperational = true
  } else if (error.name === 'RateLimitError') {
    statusCode = 429
    message = 'Too many requests'
    isOperational = true
  }

  // Don't leak error details in production for non-operational errors
  if (process.env.NODE_ENV === 'production' && !isOperational) {
    message = 'Internal server error'
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  })
}

export function createError(message: string, statusCode: number = 500): ApiError {
  const error = new Error(message) as ApiError
  error.statusCode = statusCode
  error.isOperational = true
  return error
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
