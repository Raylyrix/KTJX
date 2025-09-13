import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { createLogger } from '../utils/logger'
import { asyncHandler } from '../middleware/errorHandler'

const logger = createLogger('auth-routes')
const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  organizationName: z.string().min(1)
})

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
})

// Demo login endpoint
router.post('/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body)

    logger.info('Login attempt', { email })

    // For demo purposes, accept any email with password 'demo123'
    if (password === 'demo123') {
      // Find or create demo user
      let user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true }
      })

      if (!user) {
        // Create demo organization and user
        const organization = await prisma.organization.create({
          data: {
            name: 'Demo Organization',
            domain: email.split('@')[1]
          }
        })

        user = await prisma.user.create({
          data: {
            email,
            name: email.split('@')[0],
            role: 'ADMIN',
            organizationId: organization.id
          },
          include: { organization: true }
        })
      }

      const accessToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          organizationId: user.organizationId,
          role: user.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      )

      const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      )

      logger.info('Login successful', { userId: user.id, email })

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organization: user.organization
          },
          accessToken,
          refreshToken
        }
      })
    } else {
      logger.warn('Login failed - invalid password', { email })
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }
  })
)

// Register endpoint
router.post('/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name, organizationName } = registerSchema.parse(req.body)

    logger.info('Registration attempt', { email, organizationName })

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        domain: email.split('@')[1]
      }
    })

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'ADMIN',
        organizationId: organization.id
      },
      include: { organization: true }
    })

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    )

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    logger.info('Registration successful', { userId: user.id, email })

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization: user.organization
        },
        accessToken,
        refreshToken
      }
    })
  })
)

// Refresh token endpoint
router.post('/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = refreshTokenSchema.parse(req.body)

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { organization: true }
      })

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        })
      }

      const newAccessToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          organizationId: user.organizationId,
          role: user.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      )

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken
        }
      })

    } catch (error) {
      logger.warn('Token refresh failed', { error: error.message })
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      })
    }
  })
)

// Get current user
router.get('/me',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { organization: true }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: user.organization
      }
    })
  })
)

// Logout endpoint
router.post('/logout',
  asyncHandler(async (req: Request, res: Response) => {
    // In a real application, you would invalidate the refresh token
    // For demo purposes, we'll just return success
    logger.info('User logged out', { userId: req.user?.id })
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  })
)

export { router as authRoutes }
