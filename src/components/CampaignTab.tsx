import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCampaign } from '@/contexts/CampaignContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import RichTextEditor from './RichTextEditor'
import EmailPreview from './EmailPreview'
import GoogleSheetPreview from './GoogleSheetPreview'
import CampaignSettings from './CampaignSettings'
import { useTheme } from '@/contexts/ThemeContext'

interface CampaignTabProps {
  tabId: string
  sessionId: string | null
  onTitleChange: (title: string) => void
  onAddTab: (sessionId?: string) => void
}

export default function CampaignTab({ tabId, sessionId, onTitleChange, onAddTab }: CampaignTabProps) {
  const { sessions, authenticateGmail } = useAuth()
  const { currentSheet, loadGoogleSheet, sendCampaign } = useCampaign()
  const { resolvedTheme } = useTheme()
  
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionId)
  const [sheetUrl, setSheetUrl] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Update tab title when session changes
  useEffect(() => {
    if (selectedSessionId) {
      const session = sessions.find(s => s.id === selectedSessionId)
      if (session) {
        onTitleChange(`${session.email} - Campaign`)
      }
    } else {
      onTitleChange('New Campaign')
    }
  }, [selectedSessionId, sessions, onTitleChange])

  const handleConnectAccount = async () => {
    try {
      const session = await authenticateGmail()
      if (session) {
        setSelectedSessionId(session.id)
        onAddTab(session.id)
      }
    } catch (error) {
      console.error('Failed to connect account:', error)
    }
  }

  const handleLoadSheet = async () => {
    if (!selectedSessionId || !sheetUrl.trim()) {
      return
    }

    setIsLoading(true)
    try {
      const success = await loadGoogleSheet(sheetUrl, selectedSessionId)
      if (success) {
        // Extract placeholders from subject and body
        const allText = `${subject} ${body}`
        const placeholders = extractPlaceholders(allText)
        console.log('Detected placeholders:', placeholders)
      }
    } catch (error) {
      console.error('Failed to load sheet:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendCampaign = async () => {
    if (!selectedSessionId || !subject.trim() || !body.trim() || !currentSheet) {
      return
    }

    try {
      const campaignId = await sendCampaign({
        sessionId: selectedSessionId,
        subject,
        body,
      })
      console.log('Campaign started:', campaignId)
    } catch (error) {
      console.error('Failed to send campaign:', error)
    }
  }

  const extractPlaceholders = (text: string): string[] => {
    const regex = /\(\(([^)]+)\)\)/g
    const placeholders: string[] = []
    let match
    
    while ((match = regex.exec(text)) !== null) {
      placeholders.push(match[1])
    }
    
    return [...new Set(placeholders)]
  }

  if (!selectedSessionId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Welcome to Gmail Campaign Desktop</h2>
          <p className="text-muted-foreground max-w-md">
            Connect your Gmail account to start creating and sending email campaigns.
          </p>
          <Button onClick={handleConnectAccount} size="lg">
            Connect Gmail Account
          </Button>
        </div>
      </div>
    )
  }

  const currentSession = sessions.find(s => s.id === selectedSessionId)

  return (
    <div className="h-full flex flex-col">
      {/* Session Info */}
      <div className="border-b p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
              {currentSession?.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-medium">{currentSession?.email}</h3>
              <p className="text-sm text-muted-foreground">Connected Account</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setSelectedSessionId(null)}
          >
            Switch Account
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="compose" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="sheet">Google Sheet</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col p-4 space-y-4">
              {/* Google Sheet URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Google Sheet URL</label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                  />
                  <Button
                    onClick={handleLoadSheet}
                    disabled={!sheetUrl.trim() || isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Load Sheet'}
                  </Button>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="Enter email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Body */}
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Email Body</label>
                <div className="flex-1 min-h-0">
                  <RichTextEditor
                    value={body}
                    onChange={setBody}
                    theme={resolvedTheme}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline">Save as Template</Button>
                <Button
                  onClick={handleSendCampaign}
                  disabled={!subject.trim() || !body.trim() || !currentSheet}
                >
                  Send Campaign
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <EmailPreview
              subject={subject}
              body={body}
              sheetData={currentSheet}
              session={currentSession}
            />
          </TabsContent>

          <TabsContent value="sheet" className="flex-1 overflow-hidden">
            <GoogleSheetPreview sheetData={currentSheet} />
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-hidden">
            <CampaignSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
