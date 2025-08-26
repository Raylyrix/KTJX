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

              // Get user info
              oauth2Client.setCredentials(tokens)
              const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
              const profile = await gmail.users.getProfile({ userId: 'me' })
              
              authWindow.close()
              
              resolve({
                success: true,
                email: profile.data.emailAddress || 'unknown',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || '',
                expiryDate: tokens.expiry_date || Date.now() + 3600000,
                signature: `Best regards,\n${profile.data.emailAddress || 'User'}\nGmail Campaign Manager`
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

// IPC handlers for Google Sheets
ipcMain.handle('loadGoogleSheet', async (event, spreadsheetId: string, sheetName?: string) => {
  try {
    // This would use the Google Sheets API to load data
    // For now, return mock data structure
    const mockData = {
      id: spreadsheetId,
      name: sheetName || 'Sheet1',
      headers: ['name', 'email', 'company', 'role'],
      rows: [
        ['John Doe', 'john@example.com', 'Tech Corp', 'Manager'],
        ['Jane Smith', 'jane@example.com', 'Design Studio', 'Designer'],
        ['Bob Johnson', 'bob@example.com', 'Marketing Inc', 'Director']
      ],
      rowCount: 3,
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
    // For now, simulate sending process
    console.log('Sending campaign:', { template, recipients })
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return { 
      success: true, 
      sentCount: recipients.length,
      failedCount: 0,
      message: `Campaign sent to ${recipients.length} recipients`
    }
  } catch (error) {
    console.error('Error sending campaign:', error)
    return { success: false, error: 'Failed to send campaign' }
  }
})

// IPC handlers for app updates
ipcMain.handle('check-for-updates', async () => {
  // This would check for app updates
  return { hasUpdate: false, version: app.getVersion() }
})

ipcMain.handle('download-update', async () => {
  // This would download and install updates
  return { success: true, message: 'Update downloaded' }
})
