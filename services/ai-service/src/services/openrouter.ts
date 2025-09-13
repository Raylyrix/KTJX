import axios, { AxiosInstance } from 'axios'
import crypto from 'crypto'
import { createLogger } from '../utils/logger'
import { AIRequest, AIResponse, AIRequestOptions } from '@taskforce/shared-types'

export class OpenRouterClient {
  private client: AxiosInstance
  private logger = createLogger('openrouter-client')

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is required')
    }

    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Taskforce Mailer AI Service'
      },
      timeout: 30000 // 30 seconds
    })

    this.logger.info('OpenRouter client initialized')
  }

  async callModel(
    request: AIRequest,
    options: AIRequestOptions = {}
  ): Promise<AIResponse> {
    try {
      const model = options.model || process.env.OPENROUTER_MODEL || 'nvidia/nemotron-nano-9b-v2:free'
      
      // Generate prompt hash for caching and audit
      const promptHash = this.generatePromptHash(request.prompt)
      
      this.logger.info(`Making request to model: ${model}`, {
        type: request.type,
        promptHash,
        hasContext: !!request.context
      })

      const response = await this.client.post('/chat/completions', {
        model,
        messages: this.buildMessages(request),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })

      const completion = response.data.choices[0]
      const usage = response.data.usage

      const aiResponse: AIResponse = {
        success: true,
        data: {
          content: completion.message.content,
          finishReason: completion.finish_reason,
          promptHash,
          model
        },
        tokensUsed: usage.total_tokens,
        cost: this.calculateCost(usage.total_tokens, model)
      }

      this.logger.info('OpenRouter request completed', {
        tokensUsed: usage.total_tokens,
        cost: aiResponse.cost,
        finishReason: completion.finish_reason
      })

      return aiResponse

    } catch (error: any) {
      this.logger.error('OpenRouter request failed', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      })

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        tokensUsed: 0,
        cost: 0
      }
    }
  }

  private buildMessages(request: AIRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = []

    // System prompt based on request type
    const systemPrompt = this.getSystemPrompt(request.type)
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    // Add context if provided
    if (request.context) {
      messages.push({
        role: 'user',
        content: `Context: ${JSON.stringify(request.context, null, 2)}\n\n`
      })
    }

    // Add main prompt
    messages.push({ role: 'user', content: request.prompt })

    return messages
  }

  private getSystemPrompt(type: string): string {
    const prompts = {
      'SUMMARIZE_THREAD': `You are an AI assistant specialized in email thread analysis. 
      Summarize the email thread concisely, highlighting key points, action items, and decisions.
      Focus on the most important information and maintain a professional tone.`,

      'GENERATE_REPLY': `You are an AI assistant that helps draft professional email replies.
      Generate a helpful, contextual response that addresses the sender's needs.
      Maintain a professional yet friendly tone and be concise.`,

      'CLASSIFY_PRIORITY': `You are an AI assistant that classifies email priority levels.
      Analyze the email content and assign a priority level: LOW, MEDIUM, HIGH, or URGENT.
      Consider factors like urgency indicators, sender importance, deadlines, and content type.`,

      'ANALYZE_SENTIMENT': `You are an AI assistant that analyzes email sentiment.
      Determine if the email tone is positive, neutral, or negative.
      Provide a sentiment score from -1 (very negative) to 1 (very positive).`,

      'EXTRACT_TASKS': `You are an AI assistant that extracts tasks and commitments from emails.
      Identify any action items, deadlines, tasks, or commitments mentioned.
      Format them clearly with due dates when available.`,

      'NATURAL_LANGUAGE_QUERY': `You are an AI assistant that helps analyze email data.
      Answer questions about email analytics, patterns, and insights.
      Provide clear, actionable information based on the data provided.`,

      'AUTO_TAG': `You are an AI assistant that categorizes emails.
      Assign appropriate categories like Finance, HR, Legal, Sales, Support, etc.
      Choose the most relevant category based on the email content.`,

      'SMART_INSIGHTS': `You are an AI assistant that provides intelligent insights about email patterns.
      Analyze the data and provide actionable insights and recommendations.
      Focus on productivity improvements and communication optimization.`
    }

    return prompts[type] || 'You are a helpful AI assistant.'
  }

  private generatePromptHash(prompt: string): string {
    return crypto.createHash('sha256').update(prompt).digest('hex')
  }

  private calculateCost(tokens: number, model: string): number {
    // Cost per 1K tokens for different models (approximate)
    const costs: { [key: string]: number } = {
      'nvidia/nemotron-nano-9b-v2:free': 0, // Free model
      'openai/gpt-4': 0.03,
      'openai/gpt-3.5-turbo': 0.002,
      'anthropic/claude-3-sonnet': 0.015,
      'anthropic/claude-3-haiku': 0.0025
    }

    const costPer1K = costs[model] || 0.01
    return (tokens / 1000) * costPer1K
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/models')
      return response.status === 200
    } catch (error) {
      this.logger.error('OpenRouter health check failed', { error })
      return false
    }
  }

  // Get available models
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/models')
      return response.data.data.map((model: any) => model.id)
    } catch (error) {
      this.logger.error('Failed to fetch available models', { error })
      return []
    }
  }
}
