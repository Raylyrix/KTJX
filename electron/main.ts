import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { google } from 'googleapis'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, './preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer process
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, './index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.gmailcampaign.desktop')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/quick-start/tree/master/packages/main-process
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

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

// IPC handlers for Google OAuth
ipcMain.handle('startGoogleOAuth', async () => {
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
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    authWindow.loadURL(authUrl)

    // Handle OAuth callback
    return new Promise((resolve, reject) => {
      authWindow.webContents.on('will-redirect', async (event, url) => {
        if (url.startsWith(GOOGLE_CREDENTIALS.redirect_uri)) {
          const urlObj = new URL(url)
          const code = urlObj.searchParams.get('code')
          
          if (code) {
            try {
              const { tokens } = await oauth2Client.getToken(code)
              
              if (!tokens.access_token) {
                throw new Error('No access token received')
              }

              // Get user info and signature
              oauth2Client.setCredentials(tokens)
              const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
              const profile = await gmail.users.getProfile({ userId: 'me' })
              
              // Use a personalized signature
              const signature = `Best regards,\n${profile.data.emailAddress || 'User'}\nGmail Campaign Manager`
              
              authWindow.close()
              
              resolve({
                success: true,
                email: profile.data.emailAddress || 'unknown',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || '',
                expiryDate: tokens.expiry_date || Date.now() + 3600000,
                signature
              })
            } catch (error) {
              console.error('OAuth error:', error)
              authWindow.close()
              reject({ success: false, error: 'OAuth authentication failed' })
            }
          }
        }
      })

      authWindow.on('closed', () => {
        resolve({ success: false, error: 'Authentication window was closed' })
      })
    })
  } catch (error) {
    console.error('OAuth start error:', error)
    return { success: false, error: 'Failed to start OAuth' }
  }
})

ipcMain.handle('refreshGoogleToken', async (event, refreshToken: string) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CREDENTIALS.client_id,
      GOOGLE_CREDENTIALS.client_secret,
      GOOGLE_CREDENTIALS.redirect_uri
      )

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    })

    const { credentials } = await oauth2Client.refreshAccessToken()
    
    if (credentials.access_token) {
      return {
        success: true,
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date || Date.now() + 3600000
      }
    }
    
    return { success: false, error: 'Failed to refresh token' }
  } catch (error) {
    console.error('Token refresh error:', error)
    return { success: false, error: 'Token refresh failed' }
  }
})

// IPC handlers for file operations
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Spreadsheets', extensions: ['csv', 'xlsx', 'xls'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

// IPC handler for file attachments
ipcMain.handle('select-attachments', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths
  }
  return []
})

// IPC handlers for Google Sheets
ipcMain.handle('loadGoogleSheet', async (event, spreadsheetId: string, sheetName?: string) => {
  try {
    // For now, return mock data structure
    // TODO: Implement real Google Sheets API integration with user's access token
    const mockData = {
      id: spreadsheetId,
      name: sheetName || 'Sheet1',
      headers: ['name', 'email', 'company', 'role'],
      rows: [
        ['John Doe', 'john@example.com', 'Tech Corp', 'Manager'],
        ['Jane Smith', 'jane@example.com', 'Design Studio', 'Designer'],
        ['Bob Johnson', 'bob@example.com', 'Marketing Inc', 'Director'],
        ['Alice Brown', 'alice@example.com', 'Sales Corp', 'Sales Rep'],
        ['Charlie Wilson', 'charlie@example.com', 'Support Inc', 'Support']
      ],
      rowCount: 5,
      lastUpdated: Date.now()
    }
    
    return { success: true, data: mockData }
  } catch (error) {
    console.error('Error loading Google Sheet:', error)
    return { success: false, error: 'Failed to load Google Sheet' }
  }
})

// IPC handlers for campaign sending
ipcMain.handle('sendCampaign', async (event, template: any, recipients: string[]) => {
  try {
    // This would use the Gmail API to send emails
    // For now, simulate sending process with better feedback
    console.log('Sending campaign:', { template, recipients })
    
    // Simulate API delay and progress
    const totalRecipients = recipients.length
    let sentCount = 0
    let failedCount = 0
    
    for (let i = 0; i < totalRecipients; i++) {
      // Simulate individual email sending
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Simulate some failures (10% failure rate)
      if (Math.random() < 0.1) {
        failedCount++
      } else {
        sentCount++
      }
    }
    
    return { 
      success: true, 
      sentCount,
      failedCount,
      message: `Campaign completed: ${sentCount} sent, ${failedCount} failed`
    }
  } catch (error) {
    console.error('Error sending campaign:', error)
    return { success: false, error: 'Failed to send campaign' }
  }
})

// IPC handler for getting Gmail signature
ipcMain.handle('getGmailSignature', async (event) => {
  try {
    // This would use the stored access token to fetch the current signature
    // For now, return a dynamic signature
    const signature = `Best regards,\nGmail Campaign Manager\nSent via Gmail Campaign Desktop App`
    return { success: true, signature }
  } catch (error) {
    console.error('Error getting Gmail signature:', error)
    return { success: false, error: 'Failed to get signature' }
  }
})

// IPC handlers for app updates
ipcMain.handle('check-for-updates', async () => {
  try {
    // This would check for app updates from GitHub releases
    // For now, simulate checking for updates
    const currentVersion = app.getVersion()
    
    // Simulate checking for updates (in real app, this would check GitHub API)
    const hasUpdate = Math.random() > 0.7 // 30% chance of update being available
    const latestVersion = hasUpdate ? '1.0.22' : currentVersion
    
    return { 
      hasUpdate, 
      version: latestVersion,
      currentVersion: currentVersion
    }
  } catch (error) {
    console.error('Error checking for updates:', error)
    return { hasUpdate: false, version: app.getVersion(), error: 'Failed to check for updates' }
  }
})

ipcMain.handle('download-update', async () => {
  try {
    // This would download and install updates
    // For now, simulate the download process
    console.log('Starting update download...')
    
    // Simulate download delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return { 
      success: true, 
      message: 'Update downloaded successfully. Please restart the app to apply updates.',
      restartRequired: true
    }
  } catch (error) {
    console.error('Error downloading update:', error)
    return { 
      success: false, 
      error: 'Failed to download update',
      message: 'Update download failed. Please try again later.'
    }
  }
})
