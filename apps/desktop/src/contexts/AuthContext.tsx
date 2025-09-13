import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface GmailUser {
  email: string
  name: string
  accessToken: string
  refreshToken: string
  expiryDate: number
  signature: string
}

interface AuthContextType {
  user: GmailUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  authenticateGmail: () => Promise<{ success: boolean; message: string }>
  refreshToken: () => Promise<{ success: boolean; message: string }>
  signOut: () => void
  
  // Utility functions
  isTokenExpired: () => boolean
  getSignature: () => Promise<string>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<GmailUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    
    // Load user from localStorage
    const savedUser = localStorage.getItem('gmailUser')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        // Check if token is expired
        if (userData.expiryDate && userData.expiryDate > Date.now()) {
          setUser(userData)
        } else {
          // Token expired, try to refresh
          localStorage.removeItem('gmailUser')
          refreshToken()
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        localStorage.removeItem('gmailUser')
      }
    }
  }, [isMounted])

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (isMounted) {
      if (user) {
        localStorage.setItem('gmailUser', JSON.stringify(user))
      } else {
        localStorage.removeItem('gmailUser')
      }
    }
  }, [user, isMounted])

  const authenticateGmail = async (): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.startGoogleOAuth()
        if (result.success) {
          const userData: GmailUser = {
            email: result.email,
            name: result.email.split('@')[0], // Extract name from email
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiryDate: result.expiryDate,
            signature: result.signature
          }
          setUser(userData)
          return { success: true, message: `Successfully authenticated as ${result.email}` }
        } else {
          throw new Error(result.error || 'Authentication failed')
        }
      } else {
        // Fallback for development
        throw new Error('Gmail authentication requires Electron')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  const refreshToken = async (): Promise<{ success: boolean; message: string }> => {
    if (!user?.refreshToken) {
      return { success: false, message: 'No refresh token available' }
    }

    setIsLoading(true)
    setError(null)
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.refreshGoogleToken(user.refreshToken)
        if (result.success) {
          const updatedUser = {
            ...user,
            accessToken: result.accessToken,
            expiryDate: result.expiryDate
          }
          setUser(updatedUser)
          return { success: true, message: 'Token refreshed successfully' }
        } else {
          throw new Error(result.error || 'Token refresh failed')
        }
      } else {
        // Fallback for development
        throw new Error('Token refresh requires Electron')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed'
      setError(errorMessage)
      // If refresh fails, sign out the user
      signOut()
      return { success: false, message: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = () => {
    setUser(null)
    setError(null)
  }

  const isTokenExpired = (): boolean => {
    if (!user?.expiryDate) return true
    return Date.now() >= user.expiryDate
  }

  const getSignature = async (): Promise<string> => {
    if (user?.signature) {
      return user.signature
    }
    
    // Try to fetch signature from Gmail if we have an access token
    if (window.electronAPI && user?.accessToken) {
      try {
        const result = await window.electronAPI.getGmailSignature()
        if (result.success && result.signature) {
          // Update user with new signature
          setUser(prev => prev ? { ...prev, signature: result.signature! } : null)
          return result.signature
        }
      } catch (error) {
        console.error('Failed to fetch signature:', error)
      }
    }
    
    return 'Best regards,\nGmail Campaign Manager'
  }

  if (!isMounted) {
    return <div>Loading...</div>
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !isTokenExpired(),
    isLoading,
    error,
    authenticateGmail,
    refreshToken,
    signOut,
    isTokenExpired,
    getSignature
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
