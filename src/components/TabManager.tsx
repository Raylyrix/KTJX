import React, { useState, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import CampaignTab from './CampaignTab'
import { generateId } from '@/lib/utils'

interface Tab {
  id: string
  sessionId: string | null
  title: string
  isNew: boolean
}

export default function TabManager() {
  const { sessions } = useAuth()
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'new', sessionId: null, title: 'New Campaign', isNew: true }
  ])
  const [activeTab, setActiveTab] = useState('new')

  const addTab = useCallback((sessionId?: string) => {
    const session = sessionId ? sessions.find(s => s.id === sessionId) : null
    const newTab: Tab = {
      id: generateId(),
      sessionId: sessionId || null,
      title: session ? `${session.email} - Campaign` : 'New Campaign',
      isNew: !sessionId
    }
    
    setTabs(prev => [...prev, newTab])
    setActiveTab(newTab.id)
  }, [sessions])

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
                  <span className="truncate max-w-32">{tab.title}</span>
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
              {sessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTab()}
                  className="h-8"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  New Tab
                </Button>
              )}
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {tabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="h-full data-[state=inactive]:hidden"
              >
                <CampaignTab
                  tabId={tab.id}
                  sessionId={tab.sessionId}
                  onTitleChange={(title) => updateTabTitle(tab.id, title)}
                  onAddTab={addTab}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  )
}
