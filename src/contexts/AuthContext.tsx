import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
// Google APIs moved to Electron main process
import toast from 'react-hot-toast'

interface GmailSession {
  id: string
  email: string
  accessToken: string
  refreshToken: string
  expiryDate: number
  signature?: string
}

interface AuthContextType {
  sessions: GmailSession[]
  addSession: (session: GmailSession) => void
  removeSession: (sessionId: string) => void
  getSession: (sessionId: string) => GmailSession | undefined
  authenticateGmail: () => Promise<GmailSession | null>
  refreshToken: (sessionId: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Google OAuth credentials moved to Electron main process
// These will be handled via IPC calls

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<GmailSession[]>([])
  const [isMounted, setIsMounted] = useState(false)

  // Load sessions from localStorage on mount
  useEffect(() => {
    setIsMounted(true)
    
    try {
      const savedSessions = localStorage.getItem('gmail_sessions')
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions)
        if (Array.isArray(parsed)) {
          setSessions(parsed)
        }
      }
    } catch (error) {
      console.error('Failed to load saved sessions:', error)
    }
  }, [])

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (!isMounted) return
    
    try {
      localStorage.setItem('gmail_sessions', JSON.stringify(sessions))
    } catch (error) {
      console.error('Failed to save sessions:', error)
    }
  }, [sessions, isMounted])

  const addSession = useCallback((session: GmailSession) => {
    setSessions(prev => {
      const existing = prev.find(s => s.id === session.id)
      if (existing) {
        return prev.map(s => s.id === session.id ? session : s)
      }
      return [...prev, session]
    })
  }, [])

  const removeSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
  }, [])

  const getSession = useCallback((sessionId: string) => {
    return sessions.find(s => s.id === sessionId)
  }, [sessions])

  const authenticateGmail = useCallback(async (): Promise<GmailSession | null> => {
    try {
      // Use Electron IPC for OAuth instead of direct Google API calls
      if (window.electronAPI?.startGoogleOAuth) {
        try {
          const result = await window.electronAPI.startGoogleOAuth()
          if (result.success) {
            const session: GmailSession = {
              id: `session_${Date.now()}`,
              email: result.email,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              expiryDate: result.expiryDate,
              signature: result.signature
            }
            return session
          } else {
            toast.error(result.error || 'Authentication failed')
            return null
          }
        } catch (error) {
          console.error('IPC authentication error:', error)
          toast.error('Authentication failed')
          return null
        }
      } else {
        // Fallback to mock for development
        const mockSession: GmailSession = {
          id: `session_${Date.now()}`,
          email: `user${sessions.length + 1}@gmail.com`,
          accessToken: `mock_token_${Date.now()}`,
          refreshToken: `mock_refresh_${Date.now()}`,
          expiryDate: Date.now() + 3600000, // 1 hour
          signature: `Best regards,\nUser ${sessions.length + 1}\nGmail Campaign Manager`
        }
        
        toast.success(`Connected to ${mockSession.email} (Mock Mode)`)
        return mockSession
      }
    } catch (error) {
      console.error('Authentication failed:', error)
      toast.error('Authentication failed')
      return null
    }
  }, [sessions.length])

  const refreshToken = useCallback(async (sessionId: string): Promise<boolean> => {
    const session = getSession(sessionId)
    if (!session || !session.refreshToken) return false

    try {
      // Use Electron IPC for token refresh
      if (window.electronAPI?.refreshGoogleToken) {
        try {
          const result = await window.electronAPI.refreshGoogleToken(session.refreshToken)
          if (result.success && result.accessToken) {
            // Update session with new token
            const updatedSession: GmailSession = {
              ...session,
              accessToken: result.accessToken,
              expiryDate: result.expiryDate || Date.now() + 3600000
            }
            addSession(updatedSession)
            return true
          }
          return false
        } catch (error) {
          console.error('IPC token refresh error:', error)
          return false
        }
      } else {
        // Fallback to mock for development
        console.log('Mock token refresh for development')
        return true
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }, [getSession, addSession])

  const value: AuthContextType = {
    sessions,
    addSession,
    removeSession,
    getSession,
    authenticateGmail,
    refreshToken
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <AuthContext.Provider value={{
        sessions: [],
        addSession: () => {},
        removeSession: () => {},
        getSession: () => undefined,
        authenticateGmail: async () => null,
        refreshToken: async () => false
      }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
