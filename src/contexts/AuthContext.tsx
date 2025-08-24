import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { google } from 'googleapis'
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

// Google OAuth credentials (hardcoded as requested)
const GOOGLE_CREDENTIALS = {
  client_id: "817286133901-77vi2ruk7k8etatv2hfeeshaqmc85e5h.apps.googleusercontent.com",
  client_secret: "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",
  redirect_uri: "http://localhost"
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/spreadsheets'
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<GmailSession[]>([])

  // Load sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('gmail_sessions')
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions))
      } catch (error) {
        console.error('Failed to load saved sessions:', error)
      }
    }
  }, [])

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('gmail_sessions', JSON.stringify(sessions))
  }, [sessions])

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
      const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CREDENTIALS.client_id,
        GOOGLE_CREDENTIALS.client_secret,
        GOOGLE_CREDENTIALS.redirect_uri
      )

      // Generate auth URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
      })

      // Open auth window
      const authWindow = window.open(authUrl, 'gmail-auth', 'width=500,height=600')
      
      if (!authWindow) {
        toast.error('Failed to open authentication window')
        return null
      }

      // Wait for auth completion
      return new Promise((resolve, reject) => {
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed)
            reject(new Error('Authentication window was closed'))
          }
        }, 1000)

        // Listen for auth callback
        window.addEventListener('message', async (event) => {
          if (event.origin !== window.location.origin) return
          
          if (event.data.type === 'GOOGLE_OAUTH_CALLBACK') {
            clearInterval(checkClosed)
            authWindow.close()
            
            try {
              const { code } = event.data
              const { tokens } = await oauth2Client.getToken(code)
              
              if (!tokens.access_token) {
                throw new Error('No access token received')
              }

              // Get user info
              oauth2Client.setCredentials(tokens)
              const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
              const profile = await gmail.users.getProfile({ userId: 'me' })
              
              const session: GmailSession = {
                id: `session_${Date.now()}`,
                email: profile.data.emailAddress || 'unknown',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || '',
                expiryDate: tokens.expiry_date || Date.now() + 3600000,
              }

              // Try to get signature
              try {
                const settings = await gmail.users.getProfile({ userId: 'me' })
                if (settings.data.messagesTotal) {
                  // Get signature from Gmail settings
                  const signature = await gmail.users.getProfile({ userId: 'me' })
                  if (signature.data) {
                    session.signature = signature.data.emailAddress || ''
                  }
                }
              } catch (error) {
                console.warn('Failed to get signature:', error)
              }

              resolve(session)
            } catch (error) {
              console.error('Auth error:', error)
              reject(error)
            }
          }
        })
      })
    } catch (error) {
      console.error('Authentication failed:', error)
      toast.error('Authentication failed')
      return null
    }
  }, [])

  const refreshToken = useCallback(async (sessionId: string): Promise<boolean> => {
    const session = getSession(sessionId)
    if (!session || !session.refreshToken) return false

    try {
      const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CREDENTIALS.client_id,
        GOOGLE_CREDENTIALS.client_secret,
        GOOGLE_CREDENTIALS.redirect_uri
      )

      oauth2Client.setCredentials({
        refresh_token: session.refreshToken
      })

      const { credentials } = await oauth2Client.refreshAccessToken()
      
      if (credentials.access_token) {
        const updatedSession: GmailSession = {
          ...session,
          accessToken: credentials.access_token,
          expiryDate: credentials.expiry_date || Date.now() + 3600000
        }
        addSession(updatedSession)
        return true
      }
      return false
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
