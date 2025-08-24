import React from 'react'
import { X, Mail, FileText, History, Settings, Plus, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { sessions, authenticateGmail, removeSession } = useAuth()
  const { theme, setTheme } = useTheme()

  const handleAddAccount = async () => {
    try {
      const session = await authenticateGmail()
      if (session) {
        onClose()
      }
    } catch (error) {
      console.error('Failed to add account:', error)
    }
  }

  const handleRemoveAccount = (sessionId: string) => {
    removeSession(sessionId)
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-64 transform bg-background border-r transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <h2 className="text-lg font-semibold">Menu</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="#campaigns">
                <Mail className="mr-2 h-4 w-4" />
                Campaigns
              </a>
            </Button>
            
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="#templates">
                <FileText className="mr-2 h-4 w-4" />
                Templates
              </a>
            </Button>
            
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="#history">
                <History className="mr-2 h-4 w-4" />
                History
              </a>
            </Button>
            
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="#settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </a>
            </Button>
          </nav>
          
          {/* Accounts Section */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Gmail Accounts</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAddAccount}
                className="h-6 w-6"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm truncate">{session.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAccount(session.id)}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {sessions.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No accounts connected</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddAccount}
                    className="mt-2"
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Add Account
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
