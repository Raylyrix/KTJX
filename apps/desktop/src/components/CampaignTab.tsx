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
import { Loader2, Mail, Database, Settings, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

interface CampaignTabProps {
  tabId: string
  gmailAccount: string | null
  isAuthenticated: boolean
  onAuthenticate: () => void
  onTitleChange: (title: string) => void
}

export default function CampaignTab({ 
  tabId, 
  gmailAccount, 
  isAuthenticated, 
  onAuthenticate, 
  onTitleChange 
}: CampaignTabProps) {
  const { user, isAuthenticated: globalIsAuthenticated } = useAuth()
  const { 
    googleSheetData, 
    loadGoogleSheet, 
    sendCampaign, 
    extractPlaceholders, 
    replacePlaceholders,
    isLoading: campaignLoading,
    error: campaignError
  } = useCampaign()
  const { resolvedTheme } = useTheme()
  
  const [sheetUrl, setSheetUrl] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('compose')
  const [attachments, setAttachments] = useState<string[]>([])
  const [signature, setSignature] = useState<string>('')
  const [sendingProgress, setSendingProgress] = useState<{
    isSending: boolean
    current: number
    total: number
    message: string
  } | null>(null)

  // Update tab title when Gmail account changes - only when it actually changes
  useEffect(() => {
    const newTitle = gmailAccount ? `${gmailAccount} - Campaign` : 'New Campaign'
    // Only call onTitleChange if the title actually changed
    if (newTitle !== 'New Campaign' || gmailAccount) {
      onTitleChange(newTitle)
    }
  }, [gmailAccount]) // Remove onTitleChange from dependencies

  // Load signature when user is authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      const loadSignature = async () => {
        try {
          if (window.electronAPI) {
            // Get signature from main process
            const result = await window.electronAPI.getGmailSignature()
            if (result.success) {
              setSignature(result.signature)
            } else {
              // Fallback to user signature or default
              setSignature(user.signature || 'Best regards,\nGmail Campaign Manager')
            }
          } else {
            // Fallback to user signature or default
            setSignature(user.signature || 'Best regards,\nGmail Campaign Manager')
          }
        } catch (error) {
          console.error('Failed to load signature:', error)
          setSignature('Best regards,\nGmail Campaign Manager')
        }
      }
      loadSignature()
    }
  }, [user, isAuthenticated])

  // Show campaign errors
  useEffect(() => {
    if (campaignError) {
      toast.error(campaignError)
    }
  }, [campaignError])

  const handleConnectAccount = async () => {
    try {
      await onAuthenticate()
    } catch (error) {
      console.error('Failed to connect account:', error)
      toast.error('Failed to connect Gmail account')
    }
  }

  const handleSelectAttachments = async () => {
    try {
      if (window.electronAPI) {
        const files = await window.electronAPI.selectAttachments()
        if (files && files.length > 0) {
          setAttachments(files)
          toast.success(`Selected ${files.length} attachment(s)`)
        }
      } else {
        // Web fallback - simulate file selection
        toast('File attachments require the desktop app', { icon: 'ℹ️' })
      }
    } catch (error) {
      console.error('Failed to select attachments:', error)
      toast.error('Failed to select attachments')
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleLoadSheet = async () => {
    if (!sheetUrl.trim()) {
      toast.error('Please enter a Google Sheets URL')
      return
    }

    setIsLoading(true)
    try {
      // Extract spreadsheet ID from URL
      const urlMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      if (!urlMatch) {
        throw new Error('Invalid Google Sheets URL')
      }
      
      const spreadsheetId = urlMatch[1]
      await loadGoogleSheet(spreadsheetId)
      
      // Extract placeholders from subject and body
      const allText = `${subject} ${body}`
      const placeholders = extractPlaceholders(allText)
      if (placeholders.length > 0) {
        toast.success(`Detected ${placeholders.length} placeholders: ${placeholders.join(', ')}`)
      }
    } catch (error) {
      console.error('Failed to load sheet:', error)
      toast.error('Failed to load Google Sheet')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendCampaign = async () => {
    if (!gmailAccount) {
      toast.error('Please connect a Gmail account first')
      return
    }

    if (!subject.trim()) {
      toast.error('Please enter a subject line')
      return
    }

    if (!body.trim()) {
      toast.error('Please enter email content')
      return
    }

    if (!googleSheetData) {
      toast.error('Please load a Google Sheet first')
      return
    }

    try {
      // Extract email addresses from the sheet
      const emailColumnIndex = googleSheetData.headers.findIndex(header => 
        header.toLowerCase().includes('email')
      )
      
      if (emailColumnIndex === -1) {
        toast.error('No email column found in the sheet')
        return
      }

      const recipients = googleSheetData.rows
        .map(row => row[emailColumnIndex])
        .filter(email => email && email.includes('@'))

      if (recipients.length === 0) {
        toast.error('No valid email addresses found in the sheet')
        return
      }

      // Show sending progress
      setSendingProgress({
        isSending: true,
        current: 0,
        total: recipients.length,
        message: 'Preparing campaign...'
      })

      // Create a template for this campaign with a unique name
      const templateName = `Campaign_${Date.now()}`
      const template = {
        name: templateName,
        subject: subject,
        body: body
      }

      // Add template to context
      addTemplate(template)
      
      // Wait a bit for the state to update, then find the template
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Get the created template ID from the templates array
      const createdTemplate = templates.find(t => t.name === templateName)
      
      if (!createdTemplate) {
        throw new Error('Failed to create template')
      }
      
      const result = await sendCampaign(createdTemplate.id, recipients)
      
      if (result.success) {
        toast.success(result.message)
        // Clear form
        setSubject('')
        setBody('')
        setSheetUrl('')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Failed to send campaign:', error)
      toast.error('Failed to send campaign')
    } finally {
      // Hide sending progress
      setSendingProgress(null)
    }
  }

  const handlePreviewEmail = () => {
    if (!googleSheetData || !googleSheetData.rows.length) {
      toast.error('Please load a Google Sheet first to preview')
      return
    }

    // Show preview with first row data
    const firstRow = googleSheetData.rows[0]
    const data: Record<string, string> = {}
    googleSheetData.headers.forEach((header, index) => {
      data[header] = firstRow[index] || ''
    })

    const previewSubject = replacePlaceholders(subject, data)
    const previewBody = replacePlaceholders(body, data)
    
    // This would open a preview modal or switch to preview tab
    console.log('Preview:', { previewSubject, previewBody })
    setActiveTab('preview')
  }

  if (!isAuthenticated && !globalIsAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">📧</div>
          <h2 className="text-2xl font-bold">Connect Your Gmail Account</h2>
          <p className="text-muted-foreground">
            To start creating campaigns, you need to connect your Gmail account first.
          </p>
          <Button onClick={handleConnectAccount} size="lg">
            Connect Gmail Account
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaign Manager</h1>
          {gmailAccount && (
            <div className="space-y-1">
              <p className="text-muted-foreground">
                Connected to: <span className="font-medium text-green-600">{gmailAccount}</span>
              </p>
              {signature && (
                <p className="text-xs text-muted-foreground">
                  Signature loaded ✓
                </p>
              )}
            </div>
          )}
        </div>
        {/* Campaign Progress Indicator */}
        {sendingProgress && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {sendingProgress.message}
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {sendingProgress.current} / {sendingProgress.total}
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(sendingProgress.current / sendingProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handlePreviewEmail}
            disabled={!googleSheetData || !subject.trim() || !body.trim()}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={handleSendCampaign}
            disabled={!googleSheetData || !subject.trim() || !body.trim() || campaignLoading}
          >
            {campaignLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send Campaign
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Compose</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Data</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          {/* Campaign Form */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject Line</label>
              <Input
                placeholder="Enter your email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Email Content</label>
              <RichTextEditor
                value={body}
                onChange={setBody}
                theme={resolvedTheme}
              />
            </div>

            {/* Gmail Signature */}
            {isAuthenticated && signature && (
              <div>
                <label className="text-sm font-medium">Gmail Signature</label>
                <div className="mt-2 p-3 bg-muted rounded border">
                  <pre className="text-sm whitespace-pre-wrap text-muted-foreground">{signature}</pre>
                </div>
              </div>
            )}

            {/* File Attachments */}
            <div>
              <label className="text-sm font-medium">Attachments</label>
              <div className="mt-2 space-y-2">
                <Button
                  variant="outline"
                  onClick={handleSelectAttachments}
                  className="w-full"
                >
                  📎 Select Files
                </Button>
                
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Selected files:</p>
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate">{file.split('\\').pop()}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(index)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          {/* Google Sheets Integration */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Google Sheets URL</label>
              <div className="flex space-x-2 mt-1">
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleLoadSheet}
                  disabled={!sheetUrl.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="mr-2 h-4 w-4" />
                  )}
                  Load Sheet
                </Button>
              </div>
            </div>

            {googleSheetData && (
              <GoogleSheetPreview data={googleSheetData} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {/* Email Preview */}
          {googleSheetData && subject && body ? (
            <EmailPreview
              subject={subject}
              body={body}
              sheetData={googleSheetData}
              replacePlaceholders={replacePlaceholders}
            />
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Load a Google Sheet and compose your email to see a preview</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Campaign Settings */}
          <CampaignSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
