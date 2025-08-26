import React, { useState, useCallback } from 'react'
import { Plus, X, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import CampaignTab from './CampaignTab'
import { generateId } from '@/lib/utils'

interface Tab {
  id: string
  gmailAccount: string | null
  title: string
  isNew: boolean
  isAuthenticated: boolean
}

export default function TabManager() {
  const { user, isAuthenticated, authenticateGmail } = useAuth()
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'new', gmailAccount: null, title: 'New Campaign', isNew: true, isAuthenticated: false }
  ])
  const [activeTab, setActiveTab] = useState('new')

  const addTab = useCallback(async (gmailAccount?: string) => {
    let newTab: Tab
    
    if (gmailAccount) {
      // Tab with specific Gmail account
      newTab = {
        id: generateId(),
        gmailAccount,
        title: `${gmailAccount} - Campaign`,
        isNew: false,
        isAuthenticated: true
      }
    } else {
      // New tab that needs authentication
      newTab = {
        id: generateId(),
        gmailAccount: null,
        title: 'New Campaign',
        isNew: true,
        isAuthenticated: false
      }
    }
    
    setTabs(prev => [...prev, newTab])
    setActiveTab(newTab.id)
  }, [])

  const removeTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) return
    
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId)
      if (activeTab === tabId) {
        setActiveTab(newTabs[newTabs.length - 1].id)
      }
      return newTabs
    })
  }, [tabs, activeTab])

  const updateTabTitle = useCallback((tabId: string, title: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, title } : tab
    ))
  }, [])

  const handleAuthenticateTab = useCallback(async (tabId: string) => {
    try {
      const result = await authenticateGmail()
      if (result.success && user) {
        // Update the tab with authenticated user info
        setTabs(prev => prev.map(tab => 
          tab.id === tabId 
            ? { 
                ...tab, 
                gmailAccount: user.email, 
                title: `${user.email} - Campaign`,
                isNew: false,
                isAuthenticated: true 
              }
            : tab
        ))
      }
    } catch (error) {
      console.error('Authentication failed for tab:', error)
    }
  }, [authenticateGmail, user])

  const handleNewTabWithAuth = useCallback(async () => {
    if (isAuthenticated && user) {
      // Create new tab with current authenticated user
      await addTab(user.email)
    } else {
      // Create new tab that needs authentication
      await addTab()
    }
  }, [isAuthenticated, user, addTab])

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="border-b bg-muted/30">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList className="h-10 rounded-none border-b bg-transparent p-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-none"
                >
                  <div className="flex items-center space-x-2">
                    {tab.isAuthenticated && tab.gmailAccount && (
                      <User className="h-3 w-3 text-green-600" title={tab.gmailAccount} />
                    )}
                    <span className="truncate max-w-32">{tab.title}</span>
                  </div>
                  {tab.id !== 'new' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 h-4 w-4 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTab(tab.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="flex items-center space-x-2 px-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewTabWithAuth}
                className="h-8"
              >
                <Plus className="mr-2 h-3 w-3" />
                New Tab
              </Button>
            </div>
          </div>
          
          {/* Tab Content */}
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="flex-1 overflow-hidden">
              <CampaignTab
                tabId={tab.id}
                gmailAccount={tab.gmailAccount}
                isAuthenticated={tab.isAuthenticated}
                onAuthenticate={() => handleAuthenticateTab(tab.id)}
                onTitleChange={(title) => updateTabTitle(tab.id, title)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
