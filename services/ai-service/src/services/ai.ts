import { 
  AIRequest, 
  AIResponse, 
  ThreadSummary, 
  SmartReply, 
  TaskExtraction, 
  NaturalLanguageQuery, 
  QueryResult,
  EmailMessage,
  EmailThread,
  AIRequestType
} from '@taskforce/shared-types'
import { OpenRouterClient } from './openrouter'
import { RedisService } from './redis'
import { createLogger } from '../utils/logger'

export class AIService {
  private logger = createLogger('ai-service')
  private cache = new Map<string, any>()

  constructor(
    private openRouterClient: OpenRouterClient,
    private redisService: RedisService
  ) {}

  async summarizeThread(threadId: string, messages: EmailMessage[]): Promise<ThreadSummary> {
    const cacheKey = `summary:${threadId}`
    
    // Check cache first
    const cached = await this.redisService.get(cacheKey)
    if (cached) {
      this.logger.info('Thread summary served from cache', { threadId })
      return JSON.parse(cached)
    }

    try {
      const threadContent = this.formatThreadForAI(messages)
      const prompt = `Please analyze this email thread and provide a comprehensive summary:

${threadContent}

Please provide:
1. A concise summary of the main discussion points
2. Key decisions made
3. Action items or tasks mentioned
4. Participants involved
5. Overall sentiment (positive/neutral/negative)
6. Priority level (low/medium/high/urgent)

Format your response as JSON with the following structure:
{
  "summary": "Brief overview of the thread",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "actionItems": ["Action 1", "Action 2"],
  "participants": ["email1@domain.com", "email2@domain.com"],
  "sentiment": "positive|neutral|negative",
  "priority": "low|medium|high|urgent"
}`

      const request: AIRequest = {
        type: AIRequestType.SUMMARIZE_THREAD,
        prompt,
        context: { threadId, messageCount: messages.length }
      }

      const response = await this.openRouterClient.callModel(request)
      
      if (!response.success || !response.data?.content) {
        throw new Error(response.error || 'Failed to generate summary')
      }

      const summary = JSON.parse(response.data.content) as ThreadSummary
      summary.threadId = threadId

      // Cache the result for 1 hour
      await this.redisService.setex(cacheKey, 3600, JSON.stringify(summary))

      this.logger.info('Thread summary generated', { 
        threadId, 
        tokensUsed: response.tokensUsed,
        cost: response.cost
      })

      return summary

    } catch (error) {
      this.logger.error('Failed to summarize thread', { threadId, error })
      throw new Error('Failed to generate thread summary')
    }
  }

  async generateSmartReply(originalEmail: EmailMessage, context?: any): Promise<SmartReply[]> {
    try {
      const prompt = `Based on this email, generate 3 different reply options:

Original Email:
From: ${originalEmail.from.email}
Subject: ${originalEmail.subject}
Content: [Email content would be here - provide context-aware response]

Please generate 3 reply options with different tones:
1. Professional and formal
2. Friendly and casual  
3. Concise and direct

Format your response as JSON:
{
  "replies": [
    {
      "content": "Reply content here",
      "tone": "professional",
      "confidence": 0.9,
      "suggestedActions": ["Action 1", "Action 2"]
    }
  ]
}`

      const request: AIRequest = {
        type: AIRequestType.GENERATE_REPLY,
        prompt,
        context: { originalEmail, context }
      }

      const response = await this.openRouterClient.callModel(request)
      
      if (!response.success || !response.data?.content) {
        throw new Error(response.error || 'Failed to generate replies')
      }

      const result = JSON.parse(response.data.content)
      const replies: SmartReply[] = result.replies.map((reply: any, index: number) => ({
        draftId: `draft_${Date.now()}_${index}`,
        content: reply.content,
        tone: reply.tone as 'professional' | 'casual' | 'friendly' | 'formal',
        confidence: reply.confidence,
        suggestedActions: reply.suggestedActions
      }))

      this.logger.info('Smart replies generated', { 
        emailId: originalEmail.id,
        replyCount: replies.length,
        tokensUsed: response.tokensUsed
      })

      return replies

    } catch (error) {
      this.logger.error('Failed to generate smart replies', { error })
      throw new Error('Failed to generate smart replies')
    }
  }

  async classifyPriority(email: EmailMessage): Promise<'low' | 'medium' | 'high' | 'urgent'> {
    const cacheKey = `priority:${email.id}`
    
    // Check cache first
    const cached = await this.redisService.get(cacheKey)
    if (cached) {
      return cached as 'low' | 'medium' | 'high' | 'urgent'
    }

    try {
      const prompt = `Classify the priority of this email:

Subject: ${email.subject}
From: ${email.from.email}
Has Attachments: ${email.hasAttachments}
Labels: ${email.labels.join(', ')}

Priority levels:
- URGENT: Immediate attention required, deadlines, emergencies
- HIGH: Important business matters, time-sensitive
- MEDIUM: Regular business communication
- LOW: Informational, newsletters, non-urgent

Respond with only the priority level: URGENT, HIGH, MEDIUM, or LOW`

      const request: AIRequest = {
        type: AIRequestType.CLASSIFY_PRIORITY,
        prompt,
        context: { email }
      }

      const response = await this.openRouterClient.callModel(request)
      
      if (!response.success || !response.data?.content) {
        throw new Error(response.error || 'Failed to classify priority')
      }

      const priority = response.data.content.trim().toLowerCase() as 'low' | 'medium' | 'high' | 'urgent'
      
      // Cache for 24 hours
      await this.redisService.setex(cacheKey, 86400, priority)

      this.logger.info('Email priority classified', { 
        emailId: email.id,
        priority,
        tokensUsed: response.tokensUsed
      })

      return priority

    } catch (error) {
      this.logger.error('Failed to classify priority', { error })
      return 'medium' // Default fallback
    }
  }

  async analyzeSentiment(email: EmailMessage): Promise<number> {
    const cacheKey = `sentiment:${email.id}`
    
    // Check cache first
    const cached = await this.redisService.get(cacheKey)
    if (cached) {
      return parseFloat(cached)
    }

    try {
      const prompt = `Analyze the sentiment of this email:

Subject: ${email.subject}
From: ${email.from.email}

Provide a sentiment score from -1 (very negative) to 1 (very positive).
Consider the tone, language, and context.

Respond with only the numeric score.`

      const request: AIRequest = {
        type: AIRequestType.ANALYZE_SENTIMENT,
        prompt,
        context: { email }
      }

      const response = await this.openRouterClient.callModel(request)
      
      if (!response.success || !response.data?.content) {
        throw new Error(response.error || 'Failed to analyze sentiment')
      }

      const sentiment = parseFloat(response.data.content.trim())
      
      // Validate sentiment score
      const validSentiment = Math.max(-1, Math.min(1, sentiment))
      
      // Cache for 24 hours
      await this.redisService.setex(cacheKey, 86400, validSentiment.toString())

      this.logger.info('Email sentiment analyzed', { 
        emailId: email.id,
        sentiment: validSentiment,
        tokensUsed: response.tokensUsed
      })

      return validSentiment

    } catch (error) {
      this.logger.error('Failed to analyze sentiment', { error })
      return 0 // Neutral fallback
    }
  }

  async extractTasks(email: EmailMessage): Promise<TaskExtraction> {
    try {
      const prompt = `Extract tasks, deadlines, and commitments from this email:

Subject: ${email.subject}
From: ${email.from.email}
Body Length: ${email.bodyLength} characters

Identify:
1. Tasks or action items mentioned
2. Deadlines or due dates
3. Commitments or promises made
4. Follow-up requirements

Format your response as JSON:
{
  "tasks": [
    {
      "description": "Task description",
      "dueDate": "YYYY-MM-DD or null",
      "assignee": "email@domain.com or null",
      "priority": "low|medium|high"
    }
  ],
  "deadlines": ["YYYY-MM-DD"],
  "commitments": ["Commitment text"],
  "followUps": ["Follow-up requirement"]
}`

      const request: AIRequest = {
        type: AIRequestType.EXTRACT_TASKS,
        prompt,
        context: { email }
      }

      const response = await this.openRouterClient.callModel(request)
      
      if (!response.success || !response.data?.content) {
        throw new Error(response.error || 'Failed to extract tasks')
      }

      const extraction = JSON.parse(response.data.content) as TaskExtraction
      
      // Add IDs to tasks
      extraction.tasks = extraction.tasks.map(task => ({
        ...task,
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending' as const
      }))

      this.logger.info('Tasks extracted from email', { 
        emailId: email.id,
        taskCount: extraction.tasks.length,
        tokensUsed: response.tokensUsed
      })

      return extraction

    } catch (error) {
      this.logger.error('Failed to extract tasks', { error })
      return {
        tasks: [],
        deadlines: [],
        commitments: [],
        followUps: []
      }
    }
  }

  async processNaturalLanguageQuery(query: NaturalLanguageQuery, data: any): Promise<QueryResult> {
    try {
      const prompt = `Analyze this email data and answer the user's question:

User Question: ${query.query}

Available Data:
${JSON.stringify(data, null, 2)}

Provide a comprehensive answer that includes:
1. Direct answer to the question
2. Relevant insights from the data
3. Recommendations if applicable
4. Suggested visualization type if charts would be helpful

Format your response as JSON:
{
  "type": "chart|table|text|insight",
  "answer": "Direct answer to the question",
  "insights": ["Insight 1", "Insight 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "visualization": {
    "type": "line|bar|pie|table",
    "title": "Chart title",
    "data": "Suggested data structure for visualization"
  }
}`

      const request: AIRequest = {
        type: AIRequestType.NATURAL_LANGUAGE_QUERY,
        prompt,
        context: { query, data }
      }

      const response = await this.openRouterClient.callModel(request)
      
      if (!response.success || !response.data?.content) {
        throw new Error(response.error || 'Failed to process query')
      }

      const result = JSON.parse(response.data.content) as QueryResult

      this.logger.info('Natural language query processed', { 
        query: query.query,
        resultType: result.type,
        tokensUsed: response.tokensUsed
      })

      return result

    } catch (error) {
      this.logger.error('Failed to process natural language query', { error })
      return {
        type: 'text',
        data: {
          answer: 'Sorry, I was unable to process your query. Please try rephrasing your question.',
          insights: [],
          recommendations: []
        }
      }
    }
  }

  async generateSmartInsights(analytics: any): Promise<string[]> {
    try {
      const prompt = `Analyze this email analytics data and provide smart insights:

${JSON.stringify(analytics, null, 2)}

Generate 3-5 actionable insights that could help improve email productivity and communication patterns.

Focus on:
- Communication efficiency
- Response time optimization
- Contact relationship health
- Workload balance
- Process improvements

Format as a JSON array of insight strings.`

      const request: AIRequest = {
        type: AIRequestType.SMART_INSIGHTS,
        prompt,
        context: { analytics }
      }

      const response = await this.openRouterClient.callModel(request)
      
      if (!response.success || !response.data?.content) {
        throw new Error(response.error || 'Failed to generate insights')
      }

      const insights = JSON.parse(response.data.content) as string[]

      this.logger.info('Smart insights generated', { 
        insightCount: insights.length,
        tokensUsed: response.tokensUsed
      })

      return insights

    } catch (error) {
      this.logger.error('Failed to generate smart insights', { error })
      return ['Unable to generate insights at this time.']
    }
  }

  private formatThreadForAI(messages: EmailMessage[]): string {
    return messages
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(msg => `[${msg.timestamp.toISOString()}] ${msg.from.email}: ${msg.subject}`)
      .join('\n')
  }
}
