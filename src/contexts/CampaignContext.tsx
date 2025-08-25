import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { generateId } from '@/lib/utils'

interface CampaignTemplate {
  id: string
  name: string
  subject: string
  body: string
  createdAt: number
  updatedAt: number
}

interface CampaignHistory {
  id: string
  sessionId: string
  subject: string
  body: string
  status: 'scheduled' | 'sending' | 'completed' | 'failed'
  scheduledFor?: number
  sentCount: number
  totalCount: number
  createdAt: number
  completedAt?: number
}

interface GoogleSheetData {
  id: string
  name: string
  headers: string[]
  rows: Record<string, any>[]
  rowCount: number
}

interface CampaignContextType {
  templates: CampaignTemplate[]
  history: CampaignHistory[]
  currentSheet: GoogleSheetData | null
  addTemplate: (template: Omit<CampaignTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTemplate: (id: string, updates: Partial<CampaignTemplate>) => void
  deleteTemplate: (id: string) => void
  getTemplate: (id: string) => CampaignTemplate | undefined
  addHistory: (campaign: Omit<CampaignHistory, 'id' | 'createdAt'>) => void
  updateHistory: (id: string, updates: Partial<CampaignHistory>) => void
  loadGoogleSheet: (url: string, sessionId: string) => Promise<boolean>
  sendCampaign: (campaign: { sessionId: string; subject: string; body: string }) => Promise<string>
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined)

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [history, setHistory] = useState<CampaignHistory[]>([])
  const [currentSheet, setCurrentSheet] = useState<GoogleSheetData | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Load data from localStorage on mount
  useEffect(() => {
    setIsMounted(true)
    
    try {
      const savedTemplates = localStorage.getItem('campaign_templates')
      if (savedTemplates) {
        const parsed = JSON.parse(savedTemplates)
        if (Array.isArray(parsed)) {
          setTemplates(parsed)
        }
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }

    try {
      const savedHistory = localStorage.getItem('campaign_history')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (!isMounted) return
    
    try {
      localStorage.setItem('campaign_templates', JSON.stringify(templates))
    } catch (error) {
      console.error('Failed to save templates:', error)
    }
  }, [templates, isMounted])

  useEffect(() => {
    if (!isMounted) return
    
    try {
      localStorage.setItem('campaign_history', JSON.stringify(history))
    } catch (error) {
      console.error('Failed to save history:', error)
    }
  }, [history, isMounted])

  const addTemplate = useCallback((template: Omit<CampaignTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTemplate: CampaignTemplate = {
      ...template,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setTemplates(prev => [...prev, newTemplate])
  }, [])

  const updateTemplate = useCallback((id: string, updates: Partial<CampaignTemplate>) => {
    setTemplates(prev => prev.map(template => 
      template.id === id 
        ? { ...template, ...updates, updatedAt: Date.now() }
        : template
    ))
  }, [])

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(template => template.id !== id))
  }, [])

  const getTemplate = useCallback((id: string) => {
    return templates.find(template => template.id === id)
  }, [templates])

  const addHistory = useCallback((campaign: Omit<CampaignHistory, 'id' | 'createdAt'>) => {
    const newCampaign: CampaignHistory = {
      ...campaign,
      id: generateId(),
      createdAt: Date.now()
    }
    setHistory(prev => [...prev, newCampaign])
  }, [])

  const updateHistory = useCallback((id: string, updates: Partial<CampaignHistory>) => {
    setHistory(prev => prev.map(campaign => 
      campaign.id === id ? { ...campaign, ...updates } : campaign
    ))
  }, [])

  const loadGoogleSheet = useCallback(async (url: string, sessionId: string): Promise<boolean> => {
    try {
      // Mock Google Sheets data for now
      const mockData: GoogleSheetData = {
        id: 'mock_sheet_1',
        name: 'Campaign Recipients',
        headers: ['name', 'email', 'company', 'role'],
        rows: [
          { name: 'John Doe', email: 'john@example.com', company: 'Tech Corp', role: 'Manager' },
          { name: 'Jane Smith', email: 'jane@example.com', company: 'Design Studio', role: 'Designer' },
          { name: 'Bob Johnson', email: 'bob@example.com', company: 'Marketing Inc', role: 'Director' }
        ],
        rowCount: 3
      }
      
      setCurrentSheet(mockData)
      return true
    } catch (error) {
      console.error('Failed to load Google Sheet:', error)
      return false
    }
  }, [])

  const sendCampaign = useCallback(async (campaign: { sessionId: string; subject: string; body: string }): Promise<string> => {
    try {
      // Mock campaign sending
      const campaignId = generateId()
      
      addHistory({
        sessionId: campaign.sessionId,
        subject: campaign.subject,
        body: campaign.body,
        status: 'scheduled',
        scheduledFor: Date.now() + 60000, // 1 minute from now
        sentCount: 0,
        totalCount: currentSheet?.rowCount || 0
      })
      
      // Simulate sending process
      setTimeout(() => {
        updateHistory(campaignId, { status: 'sending' })
        
        setTimeout(() => {
          updateHistory(campaignId, { 
            status: 'completed', 
            completedAt: Date.now(),
            sentCount: currentSheet?.rowCount || 0
          })
        }, 5000)
      }, 1000)
      
      return campaignId
    } catch (error) {
      console.error('Failed to send campaign:', error)
      throw error
    }
  }, [addHistory, updateHistory, currentSheet])

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

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <CampaignContext.Provider value={{
        templates: [],
        history: [],
        currentSheet: null,
        addTemplate: () => {},
        updateTemplate: () => {},
        deleteTemplate: () => {},
        getTemplate: () => undefined,
        addHistory: () => {},
        updateHistory: () => {},
        loadGoogleSheet: async () => false,
        sendCampaign: async () => ''
      }}>
        {children}
      </CampaignContext.Provider>
    )
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
