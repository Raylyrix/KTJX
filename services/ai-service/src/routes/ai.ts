import { Router, Request, Response } from 'express'
import { createLogger } from '../utils/logger'
import { asyncHandler } from '../middleware/errorHandler'
import { requireRole } from '../middleware/auth'
import { AIService } from '../services/ai'
import { 
  AIRequest, 
  AIRequestType, 
  ThreadSummary, 
  SmartReply, 
  TaskExtraction,
  NaturalLanguageQuery,
  QueryResult 
} from '@taskforce/shared-types'
import { z } from 'zod'

const logger = createLogger('ai-routes')

// Validation schemas
const summarizeThreadSchema = z.object({
  threadId: z.string().min(1),
  messages: z.array(z.object({
    id: z.string(),
    messageId: z.string(),
    threadId: z.string(),
    subject: z.string(),
    from: z.object({
      email: z.string(),
      name: z.string().optional()
    }),
    to: z.array(z.object({
      email: z.string(),
      name: z.string().optional()
    })),
    cc: z.array(z.object({
      email: z.string(),
      name: z.string().optional()
    })).optional(),
    bcc: z.array(z.object({
      email: z.string(),
      name: z.string().optional()
    })).optional(),
    timestamp: z.string().transform(str => new Date(str)),
    isRead: z.boolean(),
    isSent: z.boolean(),
    hasAttachments: z.boolean(),
    attachmentCount: z.number(),
    labels: z.array(z.string()),
    bodyLength: z.number(),
    sentiment: z.number().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    category: z.string().optional()
  }))
})

const generateReplySchema = z.object({
  originalEmail: z.object({
    id: z.string(),
    messageId: z.string(),
    threadId: z.string(),
    subject: z.string(),
    from: z.object({
      email: z.string(),
      name: z.string().optional()
    }),
    to: z.array(z.object({
      email: z.string(),
      name: z.string().optional()
    })),
    timestamp: z.string().transform(str => new Date(str)),
    hasAttachments: z.boolean(),
    labels: z.array(z.string()),
    bodyLength: z.number(),
    priority: z.enum(['low', 'medium', 'high', 'urgent'])
  }),
  context: z.any().optional()
})

const classifyPrioritySchema = z.object({
  email: z.object({
    id: z.string(),
    subject: z.string(),
    from: z.object({
      email: z.string()
    }),
    hasAttachments: z.boolean(),
    labels: z.array(z.string())
  })
})

const analyzeSentimentSchema = z.object({
  email: z.object({
    id: z.string(),
    subject: z.string(),
    from: z.object({
      email: z.string()
    })
  })
})

const extractTasksSchema = z.object({
  email: z.object({
    id: z.string(),
    subject: z.string(),
    from: z.object({
      email: z.string()
    }),
    bodyLength: z.number()
  })
})

const naturalLanguageQuerySchema = z.object({
  query: z.object({
    query: z.string(),
    intent: z.string(),
    entities: z.array(z.string()),
    filters: z.any().optional()
  }),
  data: z.any()
})

export function aiRoutes(aiService: AIService): Router {
  const router = Router()

  // Summarize email thread
  router.post('/summarize', 
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { threadId, messages } = summarizeThreadSchema.parse(req.body)
      
      logger.info('Summarizing thread', { threadId, messageCount: messages.length })
      
      const summary = await aiService.summarizeThread(threadId, messages)
      
      res.json({
        success: true,
        data: summary
      })
    })
  )

  // Generate smart replies
  router.post('/reply', 
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { originalEmail, context } = generateReplySchema.parse(req.body)
      
      logger.info('Generating smart replies', { emailId: originalEmail.id })
      
      const replies = await aiService.generateSmartReply(originalEmail, context)
      
      res.json({
        success: true,
        data: replies
      })
    })
  )

  // Classify email priority
  router.post('/classify-priority', 
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { email } = classifyPrioritySchema.parse(req.body)
      
      logger.info('Classifying email priority', { emailId: email.id })
      
      const priority = await aiService.classifyPriority(email)
      
      res.json({
        success: true,
        data: { priority }
      })
    })
  )

  // Analyze email sentiment
  router.post('/analyze-sentiment', 
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { email } = analyzeSentimentSchema.parse(req.body)
      
      logger.info('Analyzing email sentiment', { emailId: email.id })
      
      const sentiment = await aiService.analyzeSentiment(email)
      
      res.json({
        success: true,
        data: { sentiment }
      })
    })
  )

  // Extract tasks from email
  router.post('/extract-tasks', 
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { email } = extractTasksSchema.parse(req.body)
      
      logger.info('Extracting tasks from email', { emailId: email.id })
      
      const tasks = await aiService.extractTasks(email)
      
      res.json({
        success: true,
        data: tasks
      })
    })
  )

  // Process natural language query
  router.post('/query', 
    requireRole(['ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { query, data } = naturalLanguageQuerySchema.parse(req.body)
      
      logger.info('Processing natural language query', { 
        query: query.query,
        intent: query.intent 
      })
      
      const result = await aiService.processNaturalLanguageQuery(query, data)
      
      res.json({
        success: true,
        data: result
      })
    })
  )

  // Generate smart insights
  router.post('/insights', 
    requireRole(['MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const { analytics } = req.body
      
      if (!analytics) {
        return res.status(400).json({
          success: false,
          error: 'Analytics data is required'
        })
      }
      
      logger.info('Generating smart insights', { 
        organizationId: req.user?.organizationId 
      })
      
      const insights = await aiService.generateSmartInsights(analytics)
      
      res.json({
        success: true,
        data: insights
      })
    })
  )

  // Get AI service status
  router.get('/status', 
    requireRole(['VIEWER', 'ANALYST', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req: Request, res: Response) => {
      const status = {
        service: 'ai-service',
        version: '1.0.0',
        status: 'operational',
        features: {
          summarization: true,
          smartReplies: true,
          priorityClassification: true,
          sentimentAnalysis: true,
          taskExtraction: true,
          naturalLanguageQuery: true,
          smartInsights: true
        },
        model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-nano-9b-v2:free',
        timestamp: new Date().toISOString()
      }
      
      res.json({
        success: true,
        data: status
      })
    })
  )

  return router
}
