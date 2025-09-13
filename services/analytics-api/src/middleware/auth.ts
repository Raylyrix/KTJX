import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { createLogger } from '../utils/logger'

const logger = createLogger('auth-middleware')

interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    organizationId: string
    role: string
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization header missing or invalid',
        message: 'Please provide a valid Bearer token'
      })
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured')
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'Authentication service not properly configured'
      })
      return
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      organizationId: decoded.organizationId,
      role: decoded.role
    }

    logger.debug('User authenticated', {
      userId: decoded.id,
      email: decoded.email,
      organizationId: decoded.organizationId
    })

    next()
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message })
    
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Please log in again'
      })
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Please provide a valid authentication token'
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Authentication error',
        message: 'An error occurred during authentication'
      })
    }
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      })
      return
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles
      })
      
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${roles.join(', ')}`
      })
      return
    }

    next()
  }
}
