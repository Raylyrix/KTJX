import React, { useState } from 'react'
import { Eye, EyeOff, Mail, User, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { replacePlaceholders } from '@/lib/utils'

interface EmailPreviewProps {
  subject: string
  body: string
  sheetData: any
  session: any
}

export default function EmailPreview({ subject, body, sheetData, session }: EmailPreviewProps) {
  const [showSignature, setShowSignature] = useState(true)
  const [previewRowIndex, setPreviewRowIndex] = useState(0)

  if (!sheetData || !sheetData.rows || sheetData.rows.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-medium">No Preview Available</h3>
          <p className="text-muted-foreground">
            Load a Google Sheet first to see email previews with dynamic content.
          </p>
        </div>
      </div>
    )
  }

  const currentRow = sheetData.rows[previewRowIndex]
  const previewSubject = replacePlaceholders(subject, currentRow)
  const previewBody = replacePlaceholders(body, currentRow)
  const signature = session?.signature || ''

  const nextRow = () => {
    setPreviewRowIndex((prev) => (prev + 1) % sheetData.rows.length)
  }

  const prevRow = () => {
    setPreviewRowIndex((prev) => (prev - 1 + sheetData.rows.length) % sheetData.rows.length)
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Preview Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium">Email Preview</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevRow}
              disabled={previewRowIndex === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {previewRowIndex + 1} of {sheetData.rows.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextRow}
              disabled={previewRowIndex === sheetData.rows.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSignature(!showSignature)}
        >
          {showSignature ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showSignature ? 'Hide' : 'Show'} Signature
        </Button>
      </div>

      {/* Current Row Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Previewing for:</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {Object.entries(currentRow).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                {key === 'email' ? <Mail className="h-2 w-2" /> : 
                 key === 'name' ? <User className="h-2 w-2" /> : 
                 key === 'company' ? <Building className="h-2 w-2" /> : 
                 <span className="text-xs">{key.charAt(0)}</span>}
              </div>
              <span className="font-medium">{key}:</span>
              <span className="text-muted-foreground">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Email Preview */}
      <div className="flex-1 border rounded-lg overflow-hidden bg-background">
        <div className="border-b bg-muted/50 p-4">
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-muted-foreground">From:</span>
              <span className="ml-2">{session?.email}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">To:</span>
              <span className="ml-2">{currentRow.email}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Subject:</span>
              <span className="ml-2 font-medium">{previewSubject}</span>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Email Body */}
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: previewBody }}
          />
          
          {/* Signature */}
          {showSignature && signature && (
            <div className="border-t pt-4">
              <div 
                className="prose prose-sm max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: signature }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Placeholder Info */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium mb-2">Available Placeholders:</h4>
        <div className="flex flex-wrap gap-2">
          {sheetData.headers.map((header: string) => (
            <code
              key={header}
              className="bg-muted px-2 py-1 rounded text-xs font-mono"
            >
              (({header}))
            </code>
          ))}
        </div>
      </div>
    </div>
  )
}
