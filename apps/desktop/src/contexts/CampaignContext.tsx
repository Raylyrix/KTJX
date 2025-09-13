import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface CampaignTemplate {
  id: string
  name: string
  subject: string
  body: string
  createdAt: number
  updatedAt: number
}

export interface CampaignHistory {
  id: string
  templateId: string
  templateName: string
  subject: string
  body: string
  recipients: string[]
  sentCount: number
  failedCount: number
  scheduledFor?: number
  completedAt?: number
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'
  gmailAccount: string
}

export interface GoogleSheetData {
  id: string
  name: string
  headers: string[]
  rows: string[][]
  rowCount: number
  lastUpdated: number
}

interface CampaignContextType {
  templates: CampaignTemplate[]
  history: CampaignHistory[]
  googleSheetData: GoogleSheetData | null
  currentTemplate: CampaignTemplate | null
  isLoading: boolean
  error: string | null
  
  // Template management
  addTemplate: (template: Omit<CampaignTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTemplate: (id: string, updates: Partial<CampaignTemplate>) => void
  deleteTemplate: (id: string) => void
  setCurrentTemplate: (template: CampaignTemplate | null) => void
  
  // Campaign history
  addHistory: (history: Omit<CampaignHistory, 'id' | 'completedAt'>) => void
  updateHistory: (id: string, updates: Partial<CampaignHistory>) => void
  
  // Google Sheets integration
  loadGoogleSheet: (spreadsheetId: string, sheetName?: string) => Promise<void>
  clearGoogleSheetData: () => void
  
  // Campaign sending
  sendCampaign: (templateId: string, recipients: string[], scheduledFor?: number) => Promise<{ success: boolean; message: string }>
  
  // Utility functions
  extractPlaceholders: (text: string) => string[]
  replacePlaceholders: (text: string, data: Record<string, string>) => string
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined)

export function useCampaign() {
  const context = useContext(CampaignContext)
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider')
  }
  return context
}

interface CampaignProviderProps {
  children: ReactNode
}

export function CampaignProvider({ children }: CampaignProviderProps) {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [history, setHistory] = useState<CampaignHistory[]>([])
  const [googleSheetData, setGoogleSheetData] = useState<GoogleSheetData | null>(null)
  const [currentTemplate, setCurrentTemplate] = useState<CampaignTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    
    // Load templates from localStorage
    const savedTemplates = localStorage.getItem('campaignTemplates')
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates))
      } catch (error) {
        console.error('Error loading templates:', error)
      }
    }

    // Load history from localStorage
    const savedHistory = localStorage.getItem('campaignHistory')
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (error) {
        console.error('Error loading history:', error)
      }
    }
  }, [isMounted])

  // Save templates to localStorage whenever they change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('campaignTemplates', JSON.stringify(templates))
    }
  }, [templates, isMounted])

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('campaignHistory', JSON.stringify(history))
    }
  }, [history, isMounted])

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const addTemplate = (template: Omit<CampaignTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTemplate: CampaignTemplate = {
      ...template,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setTemplates(prev => [...prev, newTemplate])
  }

  const updateTemplate = (id: string, updates: Partial<CampaignTemplate>) => {
    setTemplates(prev => prev.map(template => 
      template.id === id 
        ? { ...template, ...updates, updatedAt: Date.now() }
        : template
    ))
  }

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(template => template.id !== id))
    if (currentTemplate?.id === id) {
      setCurrentTemplate(null)
    }
  }

  const addHistory = (history: Omit<CampaignHistory, 'id' | 'completedAt'>) => {
    const newHistory: CampaignHistory = {
      ...history,
      id: generateId()
    }
    setHistory(prev => [...prev, newHistory])
  }

  const updateHistory = (id: string, updates: Partial<CampaignHistory>) => {
    setHistory(prev => prev.map(history => 
      history.id === id 
        ? { ...history, ...updates }
        : history
    ))
  }

  const loadGoogleSheet = async (spreadsheetId: string, sheetName?: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Use Electron IPC to load Google Sheets data
      if (window.electronAPI) {
        // This will be implemented in the main process
        const result = await window.electronAPI.loadGoogleSheet(spreadsheetId, sheetName)
        if (result.success) {
          setGoogleSheetData(result.data)
        } else {
          throw new Error(result.error || 'Failed to load Google Sheet')
        }
      } else {
        // Fallback for web development - simulate Google Sheets data
        console.log('Running in web mode - using mock data')
        const mockData: GoogleSheetData = {
          id: spreadsheetId,
          name: sheetName || 'Sheet1',
          headers: ['name', 'email', 'company', 'role'],
          rows: [
            ['John Doe', 'john@example.com', 'Tech Corp', 'Manager'],
            ['Jane Smith', 'jane@example.com', 'Design Studio', 'Designer'],
            ['Bob Johnson', 'bob@example.com', 'Marketing Inc', 'Director']
          ],
          rowCount: 3,
          lastUpdated: Date.now()
        }
        setGoogleSheetData(mockData)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load Google Sheet')
      console.error('Error loading Google Sheet:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearGoogleSheetData = () => {
    setGoogleSheetData(null)
  }

  const sendCampaign = async (templateId: string, recipients: string[], scheduledFor?: number): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const template = templates.find(t => t.id === templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      // Create campaign history entry
      const campaignHistory: Omit<CampaignHistory, 'id' | 'completedAt'> = {
        templateId,
        templateName: template.name,
        subject: template.subject,
        body: template.body,
        recipients,
        sentCount: 0,
        failedCount: 0,
        scheduledFor,
        status: scheduledFor ? 'scheduled' : 'sending',
        gmailAccount: 'Connected Gmail Account' // This should come from auth context
      }

      addHistory(campaignHistory)

      if (scheduledFor) {
        // Campaign is scheduled
        return { success: true, message: `Campaign scheduled for ${new Date(scheduledFor).toLocaleString()}` }
      }

      // Send campaign immediately
      if (window.electronAPI) {
        const result = await window.electronAPI.sendCampaign(template, recipients)
        if (result.success) {
          // Update history with results
          const historyEntry = history.find(h => h.templateId === templateId)
          if (historyEntry) {
            updateHistory(historyEntry.id, {
              status: 'completed',
              sentCount: result.sentCount || recipients.length,
              failedCount: result.failedCount || 0,
              completedAt: Date.now()
            })
          }
          return { success: true, message: `Campaign sent successfully to ${recipients.length} recipients` }
        } else {
          throw new Error(result.error || 'Failed to send campaign')
        }
      } else {
        // Fallback for development
        throw new Error('Campaign sending requires Electron')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send campaign'
      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  const extractPlaceholders = (text: string): string[] => {
    // Support multiple placeholder formats: ((placeholder)), {{placeholder}}, [placeholder]
    const placeholderRegex = /(?:\(\(|{{|\[)([^)\]}])(?:\)\)|}}|\])/g
    const placeholders: string[] = []
    let match
    
    while ((match = placeholderRegex.exec(text)) !== null) {
      placeholders.push(match[1])
    }
    
    return [...new Set(placeholders)] // Remove duplicates
  }

  const replacePlaceholders = (text: string, data: Record<string, string>): string => {
    // Support multiple placeholder formats and provide fallbacks
    return text
      .replace(/\(\(([^)]+)\)\)/g, (match, placeholder) => {
        return data[placeholder] || `[${placeholder}]`
      })
      .replace(/{{([^}]+)}}/g, (match, placeholder) => {
        return data[placeholder] || `[${placeholder}]`
      })
      .replace(/\[([^\]]+)\]/g, (match, placeholder) => {
        return data[placeholder] || `[${placeholder}]`
      })
  }

  if (!isMounted) {
    return <div>Loading...</div>
  }

  const value: CampaignContextType = {
    templates,
    history,
    googleSheetData,
    currentTemplate,
    isLoading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    setCurrentTemplate,
    addHistory,
    updateHistory,
    loadGoogleSheet,
    clearGoogleSheetData,
    sendCampaign,
    extractPlaceholders,
    replacePlaceholders
  }

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  )
}
