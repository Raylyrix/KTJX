import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { google } from 'googleapis'
import toast from 'react-hot-toast'

interface CampaignTemplate {
  id: string
  name: string
  subject: string
  body: string
  placeholders: string[]
  attachments: string[]
  createdAt: Date
}

interface CampaignHistory {
  id: string
  sessionId: string
  templateId?: string
  subject: string
  body: string
  recipients: number
  sent: number
  failed: number
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

interface GoogleSheetData {
  spreadsheetId: string
  sheetName: string
  headers: string[]
  rows: Record<string, any>[]
  totalRows: number
}

interface CampaignContextType {
  templates: CampaignTemplate[]
  history: CampaignHistory[]
  currentSheet: GoogleSheetData | null
  addTemplate: (template: Omit<CampaignTemplate, 'id' | 'createdAt'>) => void
  updateTemplate: (id: string, updates: Partial<CampaignTemplate>) => void
  deleteTemplate: (id: string) => void
  getTemplate: (id: string) => CampaignTemplate | undefined
  addHistory: (history: Omit<CampaignHistory, 'id'>) => void
  updateHistory: (id: string, updates: Partial<CampaignHistory>) => void
  loadGoogleSheet: (url: string, sessionId: string) => Promise<boolean>
  sendCampaign: (campaign: {
    sessionId: string
    templateId?: string
    subject: string
    body: string
    scheduledAt?: Date
    batchSize?: number
    batchInterval?: number
  }) => Promise<string>
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined)

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [history, setHistory] = useState<CampaignHistory[]>([])
  const [currentSheet, setCurrentSheet] = useState<GoogleSheetData | null>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem('campaign_templates')
    const savedHistory = localStorage.getItem('campaign_history')
    
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates)
        setTemplates(parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt)
        })))
      } catch (error) {
        console.error('Failed to load templates:', error)
      }
    }
    
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory)
        setHistory(parsed.map((h: any) => ({
          ...h,
          scheduledAt: h.scheduledAt ? new Date(h.scheduledAt) : undefined,
          startedAt: h.startedAt ? new Date(h.startedAt) : undefined,
          completedAt: h.completedAt ? new Date(h.completedAt) : undefined
        })))
      } catch (error) {
        console.error('Failed to load history:', error)
      }
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('campaign_templates', JSON.stringify(templates))
  }, [templates])

  useEffect(() => {
    localStorage.setItem('campaign_history', JSON.stringify(history))
  }, [history])

  const addTemplate = useCallback((template: Omit<CampaignTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: CampaignTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      createdAt: new Date()
    }
    setTemplates(prev => [...prev, newTemplate])
    toast.success('Template saved successfully')
  }, [])

  const updateTemplate = useCallback((id: string, updates: Partial<CampaignTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }, [])

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
    toast.success('Template deleted')
  }, [])

  const getTemplate = useCallback((id: string) => {
    return templates.find(t => t.id === id)
  }, [templates])

  const addHistory = useCallback((historyItem: Omit<CampaignHistory, 'id'>) => {
    const newHistory: CampaignHistory = {
      ...historyItem,
      id: `history_${Date.now()}`
    }
    setHistory(prev => [...prev, newHistory])
  }, [])

  const updateHistory = useCallback((id: string, updates: Partial<CampaignHistory>) => {
    setHistory(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }, [])

  const loadGoogleSheet = useCallback(async (url: string, sessionId: string): Promise<boolean> => {
    try {
      // Extract spreadsheet ID from URL
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      if (!match) {
        toast.error('Invalid Google Sheets URL')
        return false
      }

      const spreadsheetId = match[1]
      
      // For now, we'll create a mock sheet structure
      // In a real implementation, you'd use the Google Sheets API
      const mockSheet: GoogleSheetData = {
        spreadsheetId,
        sheetName: 'Sheet1',
        headers: ['email', 'name', 'company', 'role'],
        rows: [
          { email: 'john@example.com', name: 'John Doe', company: 'Tech Corp', role: 'Developer' },
          { email: 'jane@example.com', name: 'Jane Smith', company: 'Design Inc', role: 'Designer' },
          { email: 'bob@example.com', name: 'Bob Johnson', company: 'Marketing Co', role: 'Manager' }
        ],
        totalRows: 3
      }

      setCurrentSheet(mockSheet)
      toast.success('Google Sheet loaded successfully')
      return true
    } catch (error) {
      console.error('Failed to load Google Sheet:', error)
      toast.error('Failed to load Google Sheet')
      return false
    }
  }, [])

  const sendCampaign = useCallback(async (campaign: {
    sessionId: string
    templateId?: string
    subject: string
    body: string
    scheduledAt?: Date
    batchSize?: number
    batchInterval?: number
  }): Promise<string> => {
    const campaignId = `campaign_${Date.now()}`
    
    // Add to history
    const historyItem: Omit<CampaignHistory, 'id'> = {
      sessionId: campaign.sessionId,
      templateId: campaign.templateId,
      subject: campaign.subject,
      body: campaign.body,
      recipients: currentSheet?.totalRows || 0,
      sent: 0,
      failed: 0,
      status: campaign.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: campaign.scheduledAt
    }

    addHistory(historyItem)

    if (campaign.scheduledAt) {
      // Schedule campaign
      const delay = campaign.scheduledAt.getTime() - Date.now()
      setTimeout(() => {
        updateHistory(campaignId, { status: 'sending', startedAt: new Date() })
        // Start sending emails
        // This would integrate with the Gmail API
      }, delay)
      
      toast.success(`Campaign scheduled for ${campaign.scheduledAt.toLocaleString()}`)
    } else {
      // Send immediately
      updateHistory(campaignId, { status: 'sending', startedAt: new Date() })
      // Start sending emails
      // This would integrate with the Gmail API
      
      toast.success('Campaign started')
    }

    return campaignId
  }, [currentSheet, addHistory, updateHistory])

  const value: CampaignContextType = {
    templates,
    history,
    currentSheet,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    addHistory,
    updateHistory,
    loadGoogleSheet,
    sendCampaign
  }

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaign() {
  const context = useContext(CampaignContext)
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider')
  }
  return context
}
