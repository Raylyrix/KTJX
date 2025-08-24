declare global {
  interface Window {
    electronAPI: {
      startGoogleOAuth: () => Promise<{
        success: boolean
        email?: string
        accessToken?: string
        refreshToken?: string
        expiryDate?: number
        signature?: string
        error?: string
      }>
      refreshGoogleToken: (refreshToken: string) => Promise<{
        success: boolean
        accessToken?: string
        expiryDate?: number
        error?: string
      }>
      selectFile: () => Promise<string | null>
      checkForUpdates: () => Promise<{
        hasUpdate: boolean
        version: string
      }>
      downloadUpdate: () => Promise<{
        success: boolean
        message: string
      }>
    }
  }
}

export {}
