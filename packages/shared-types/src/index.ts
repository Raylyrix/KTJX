// Email Analytics Types
export interface EmailAnalytics {
  volume: {
    sent: number
    received: number
    daily: TimeSeriesData[]
    weekly: TimeSeriesData[]
    monthly: TimeSeriesData[]
  }
  responseTime: {
    average: number
    median: number
    p90: number
    p95: number
    distribution: ResponseTimeDistribution[]
  }
  contacts: ContactAnalytics[]
  threads: ThreadAnalytics[]
  sentiment: SentimentAnalysis
  priority: PriorityDistribution
  attachments: AttachmentAnalytics
}

export interface TimeSeriesData {
  date: string
  value: number
  label?: string
}

export interface ResponseTimeDistribution {
  range: string
  count: number
  percentage: number
}

export interface ContactAnalytics {
  email: string
  name?: string
  domain: string
  messageCount: number
  responseRate: number
  avgResponseTime: number
  lastContactAt: Date
  healthScore: number
}

export interface ThreadAnalytics {
  threadId: string
  subject: string
  messageCount: number
  avgResponseTime: number
  isResolved: boolean
  lastMessageAt: Date
  participants: string[]
}

export interface SentimentAnalysis {
  average: number
  distribution: {
    positive: number
    neutral: number
    negative: number
  }
  trends: TimeSeriesData[]
}

export interface PriorityDistribution {
  urgent: number
  high: number
  medium: number
  low: number
}

export interface AttachmentAnalytics {
  percentage: number
  totalCount: number
  byType: {
    [type: string]: number
  }
}

// AI Service Types
export interface AIRequest {
  type: AIRequestType
  prompt: string
  context?: any
  options?: AIRequestOptions
}

export interface AIResponse {
  success: boolean
  data?: any
  error?: string
  tokensUsed?: number
  cost?: number
}

export interface ThreadSummary {
  threadId: string
  summary: string
  keyPoints: string[]
  actionItems: string[]
  participants: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export interface SmartReply {
  draftId: string
  content: string
  tone: 'professional' | 'casual' | 'friendly' | 'formal'
  confidence: number
  suggestedActions: string[]
}

export interface TaskExtraction {
  tasks: Task[]
  deadlines: Date[]
  commitments: string[]
  followUps: string[]
}

export interface Task {
  id: string
  description: string
  dueDate?: Date
  assignee?: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed'
}

export interface NaturalLanguageQuery {
  query: string
  intent: QueryIntent
  entities: string[]
  filters?: QueryFilters
}

export interface QueryResult {
  type: 'chart' | 'table' | 'text' | 'insight'
  data: any
  visualization?: VisualizationConfig
  insights?: string[]
}

// Email Processing Types
export interface EmailMessage {
  id: string
  messageId: string
  threadId: string
  subject: string
  from: EmailAddress
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  timestamp: Date
  isRead: boolean
  isSent: boolean
  hasAttachments: boolean
  attachmentCount: number
  labels: string[]
  bodyLength: number
  sentiment?: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
}

export interface EmailAddress {
  email: string
  name?: string
}

export interface EmailThread {
  id: string
  threadId: string
  subject: string
  messageCount: number
  lastMessageAt: Date
  responseTime?: number
  isResolved: boolean
  participants: string[]
  messages: EmailMessage[]
}

// Analytics API Types
export interface AnalyticsQuery {
  startDate: Date
  endDate: Date
  organizationId: string
  userId?: string
  mailboxId?: string
  filters?: AnalyticsFilters
}

export interface AnalyticsFilters {
  contacts?: string[]
  domains?: string[]
  labels?: string[]
  categories?: string[]
  priorities?: string[]
  hasAttachments?: boolean
  sentimentRange?: {
    min: number
    max: number
  }
}

// Dashboard Types
export interface DashboardConfig {
  id: string
  name: string
  widgets: DashboardWidget[]
  layout: WidgetLayout[]
  filters: DashboardFilters
  isShared: boolean
  organizationId: string
  userId?: string
}

export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  config: any
  size: WidgetSize
  position: WidgetPosition
}

export interface WidgetLayout {
  widgetId: string
  x: number
  y: number
  w: number
  h: number
}

export interface DashboardFilters {
  dateRange: {
    start: Date
    end: Date
  }
  contacts?: string[]
  teams?: string[]
  mailboxes?: string[]
}

// Automation Types
export interface AutomationRule {
  id: string
  name: string
  condition: RuleCondition
  action: RuleAction
  priority: number
  isActive: boolean
  organizationId: string
}

export interface RuleCondition {
  type: 'sender' | 'subject' | 'content' | 'time' | 'attachment'
  operator: 'equals' | 'contains' | 'regex' | 'greater_than' | 'less_than'
  value: string | number | boolean
}

export interface RuleAction {
  type: 'tag' | 'priority' | 'assign' | 'notify' | 'move' | 'delete'
  value: string | number | boolean
  target?: string
}

// Report Types
export interface ReportConfig {
  id: string
  name: string
  type: 'weekly' | 'monthly' | 'quarterly' | 'custom'
  template: ReportTemplate
  recipients: string[]
  schedule?: ReportSchedule
  organizationId: string
}

export interface ReportTemplate {
  sections: ReportSection[]
  includeAIInsights: boolean
  includeCharts: boolean
  format: 'pdf' | 'excel' | 'csv'
}

export interface ReportSection {
  type: 'summary' | 'volume' | 'response_time' | 'contacts' | 'ai_insights'
  title: string
  config: any
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly'
  dayOfWeek?: number
  dayOfMonth?: number
  time: string
}

// Enums
export enum AIRequestType {
  SUMMARIZE_THREAD = 'SUMMARIZE_THREAD',
  GENERATE_REPLY = 'GENERATE_REPLY',
  CLASSIFY_PRIORITY = 'CLASSIFY_PRIORITY',
  ANALYZE_SENTIMENT = 'ANALYZE_SENTIMENT',
  EXTRACT_TASKS = 'EXTRACT_TASKS',
  NATURAL_LANGUAGE_QUERY = 'NATURAL_LANGUAGE_QUERY',
  AUTO_TAG = 'AUTO_TAG',
  SMART_INSIGHTS = 'SMART_INSIGHTS'
}

export enum QueryIntent {
  VOLUME_ANALYSIS = 'VOLUME_ANALYSIS',
  RESPONSE_TIME = 'RESPONSE_TIME',
  CONTACT_ANALYSIS = 'CONTACT_ANALYSIS',
  THREAD_ANALYSIS = 'THREAD_ANALYSIS',
  SENTIMENT_ANALYSIS = 'SENTIMENT_ANALYSIS',
  INSIGHT_REQUEST = 'INSIGHT_REQUEST'
}

export enum WidgetType {
  KPI_CARD = 'KPI_CARD',
  LINE_CHART = 'LINE_CHART',
  BAR_CHART = 'BAR_CHART',
  PIE_CHART = 'PIE_CHART',
  TABLE = 'TABLE',
  AI_INSIGHTS = 'AI_INSIGHTS',
  CONTACT_LIST = 'CONTACT_LIST',
  THREAD_LIST = 'THREAD_LIST'
}

export enum WidgetSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  EXTRA_LARGE = 'EXTRA_LARGE'
}

export enum VisualizationType {
  LINE = 'LINE',
  BAR = 'BAR',
  PIE = 'PIE',
  SCATTER = 'SCATTER',
  AREA = 'AREA',
  TABLE = 'TABLE'
}

// Configuration Types
export interface VisualizationConfig {
  type: VisualizationType
  title: string
  xAxis?: AxisConfig
  yAxis?: AxisConfig
  series?: SeriesConfig[]
  colors?: string[]
  options?: any
}

export interface AxisConfig {
  label: string
  type: 'category' | 'value' | 'time'
  format?: string
}

export interface SeriesConfig {
  name: string
  data: any[]
  type?: 'line' | 'bar' | 'pie'
  color?: string
}

export interface AIRequestOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  includeMetadata?: boolean
}

export interface WidgetPosition {
  x: number
  y: number
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: PaginationInfo
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// Error Types
export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: Date
}

// WebSocket Types
export interface WebSocketMessage {
  type: string
  data: any
  timestamp: Date
}

export interface RealtimeUpdate {
  type: 'email_received' | 'email_sent' | 'analytics_updated' | 'ai_insight'
  data: any
  organizationId: string
  userId?: string
}
