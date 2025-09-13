import React from 'react'
import { X, Mail, FileText, History, Settings, Plus, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useCampaign } from '@/contexts/CampaignContext'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, isAuthenticated, authenticateGmail, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { templates, history } = useCampaign()

  const handleAddAccount = async () => {
    try {
      const result = await authenticateGmail()
      if (result.success) {
        onClose()
      }
    } catch (error) {
      console.error('Failed to add account:', error)
    }
  }

  const handleSignOut = () => {
    signOut()
    onClose()
  }

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
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
          {/* User Info */}
          {isAuthenticated && user && (
            <div className="p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Connected</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start" 
              onClick={() => {
                // This would navigate to campaigns view
                console.log('Navigate to campaigns')
                onClose()
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Campaigns
              {templates.length > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  {templates.length}
                </span>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                // This would navigate to templates view
                console.log('Navigate to templates')
                onClose()
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Templates
              {templates.length > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  {templates.length}
                </span>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                // This would navigate to history view
                console.log('Navigate to history')
                onClose()
              }}
            >
              <History className="mr-2 h-4 w-4" />
              History
              {history.length > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  {history.length}
                </span>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                // This would navigate to settings view
                console.log('Navigate to settings')
                onClose()
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </nav>
          
          {/* Account Management */}
          <div className="border-t p-4 space-y-3">
            {!isAuthenticated ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleAddAccount}
              >
                <Plus className="mr-2 h-3 w-3" />
                Connect Gmail Account
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleThemeToggle}
                >
                  <div className="mr-2 h-4 w-4">
                    {theme === 'light' ? '🌙' : '☀️'}
                  </div>
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
