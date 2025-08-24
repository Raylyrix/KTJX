import React, { useState } from 'react'
import { Calendar, Clock, Send, Save, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function CampaignSettings() {
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [batchSize, setBatchSize] = useState('10')
  const [batchInterval, setBatchInterval] = useState('5')
  const [statusColumn, setStatusColumn] = useState('status')

  const handleSaveSettings = () => {
    // Save campaign settings
    console.log('Saving campaign settings:', {
      scheduledDate,
      scheduledTime,
      batchSize,
      batchInterval,
      statusColumn
    })
  }

  const getScheduledDateTime = () => {
    if (!scheduledDate || !scheduledTime) return null
    return new Date(`${scheduledDate}T${scheduledTime}`)
  }

  const isScheduled = getScheduledDateTime() !== null
  const scheduledDateTime = getScheduledDateTime()

  return (
    <div className="h-full flex flex-col p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Settings className="h-5 w-5" />
        <h3 className="text-lg font-medium">Campaign Settings</h3>
      </div>

      {/* Scheduling */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <h4 className="font-medium">Scheduling</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Time</label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
        </div>

        {isScheduled && scheduledDateTime && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm">
              Campaign scheduled for: <span className="font-medium">
                {scheduledDateTime.toLocaleString()}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.ceil((scheduledDateTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days from now
            </p>
          </div>
        )}
      </div>

      {/* Batching */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Send className="h-4 w-4" />
          <h4 className="font-medium">Batching & Rate Limiting</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Batch Size</label>
            <Input
              type="number"
              min="1"
              max="100"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              Emails per batch (Gmail limit: 500/day)
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Batch Interval (minutes)</label>
            <Input
              type="number"
              min="1"
              max="60"
              value={batchInterval}
              onChange={(e) => setBatchInterval(e.target.value)}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">
              Time between batches
            </p>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-sm text-muted-foreground">
            With current settings: {batchSize} emails every {batchInterval} minutes
          </p>
        </div>
      </div>

      {/* Google Sheets Integration */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Save className="h-4 w-4" />
          <h4 className="font-medium">Google Sheets Integration</h4>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Status Column Name</label>
          <Input
            value={statusColumn}
            onChange={(e) => setStatusColumn(e.target.value)}
            placeholder="status"
          />
          <p className="text-xs text-muted-foreground">
            Column name to track email status (Sent, Failed, Scheduled)
          </p>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="space-y-4">
        <h4 className="font-medium">Advanced Options</h4>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">Include Gmail signature automatically</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">Send test email before campaign</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">Stop on first error</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Save campaign as template</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline">Reset to Defaults</Button>
        <Button onClick={handleSaveSettings}>Save Settings</Button>
      </div>

      {/* Info */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium mb-2">Important Notes:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Gmail has a daily sending limit of 500 emails per account</li>
          <li>• Large campaigns are automatically batched to avoid rate limiting</li>
          <li>• Campaign status is automatically updated in your Google Sheet</li>
          <li>• You can pause/resume campaigns at any time</li>
        </ul>
      </div>
    </div>
  )
}
