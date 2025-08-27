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
      selectAttachments: () => Promise<string[]>
      loadGoogleSheet: (spreadsheetId: string, sheetName?: string) => Promise<{
        success: boolean
        data?: any
        error?: string
      }>
      sendCampaign: (template: any, recipients: string[]) => Promise<{
        success: boolean
        sentCount?: number
        failedCount?: number
        message?: string
        error?: string
      }>
      getGmailSignature: () => Promise<{
        success: boolean
        signature?: string
        error?: string
      }>
      checkForUpdates: () => Promise<{ hasUpdate: boolean; version: string }>
      downloadUpdate: () => Promise<{ success: boolean; message: string }>
    }
  }
}

export {}
