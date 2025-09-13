import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Download, Info, Globe, Github, Mail, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface AboutProps {
  className?: string
}

export default function About({ className }: AboutProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean
    version: string
    currentVersion: string
  } | null>(null)

  const appVersion = '1.0.21'
  const appName = 'Gmail Campaign Desktop'
  const appDescription = 'Professional Gmail Campaign Desktop App with Google Cloud OAuth'

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI) {
      toast.error('Update checking requires the desktop app')
      return
    }

    setIsCheckingUpdate(true)
    try {
      const result = await window.electronAPI.checkForUpdates()
      setUpdateInfo({
        hasUpdate: result.hasUpdate,
        version: result.version,
        currentVersion: appVersion
      })
      
      if (result.hasUpdate) {
        toast.success(`Update available: v${result.version}`)
      } else {
        toast.info('You are using the latest version')
      }
    } catch (error) {
      console.error('Failed to check for updates:', error)
      toast.error('Failed to check for updates')
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI) {
      toast.error('Update downloading requires the desktop app')
      return
    }

    setIsDownloadingUpdate(true)
    try {
      const result = await window.electronAPI.downloadUpdate()
      if (result.success) {
        toast.success(result.message)
        // Close the dialog after successful download
        setIsOpen(false)
      } else {
        toast.error('Failed to download update')
      }
    } catch (error) {
      console.error('Failed to download update:', error)
      toast.error('Failed to download update')
    } finally {
      setIsDownloadingUpdate(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={className}>
          <Info className="h-4 w-4 mr-2" />
          About
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>About {appName}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* App Info */}
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-primary">{appName}</div>
            <p className="text-sm text-muted-foreground">{appDescription}</p>
            <Badge variant="secondary" className="text-xs">
              Version {appVersion}
            </Badge>
          </div>

          <Separator />

          {/* Update Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Check for Updates</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckForUpdates}
                disabled={isCheckingUpdate}
              >
                {isCheckingUpdate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isCheckingUpdate ? 'Checking...' : 'Check'}
              </Button>
            </div>

            {updateInfo && (
              <div className="space-y-2">
                {updateInfo.hasUpdate ? (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Update Available!
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Current: v{updateInfo.currentVersion} → New: v{updateInfo.version}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleDownloadUpdate}
                        disabled={isDownloadingUpdate}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isDownloadingUpdate ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {isDownloadingUpdate ? 'Downloading...' : 'Download'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      ✓ You are using the latest version
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Features */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Features</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>• Gmail OAuth Integration</div>
              <div>• Google Sheets Support</div>
              <div>• Rich Text Editor</div>
              <div>• Campaign Management</div>
              <div>• File Attachments</div>
              <div>• Multi-tab Support</div>
            </div>
          </div>

          <Separator />

          {/* Links */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Links</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Globe className="h-3 w-3 mr-1" />
                Website
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Github className="h-3 w-3 mr-1" />
                GitHub
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Mail className="h-3 w-3 mr-1" />
                Support
              </Button>
            </div>
          </div>

          <Separator />

          {/* Copyright */}
          <div className="text-center text-xs text-muted-foreground">
            <p>© 2024 Gmail Campaign Desktop</p>
            <p>Built with Electron, React, and TypeScript</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
