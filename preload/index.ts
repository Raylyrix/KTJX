import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  startGoogleOAuth: () => ipcRenderer.invoke('startGoogleOAuth'),
  refreshGoogleToken: (refreshToken: string) => ipcRenderer.invoke('refreshGoogleToken', refreshToken),
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectAttachments: () => ipcRenderer.invoke('select-attachments'),
  loadGoogleSheet: (spreadsheetId: string, sheetName?: string) => ipcRenderer.invoke('loadGoogleSheet', spreadsheetId, sheetName),
  sendCampaign: (template: any, recipients: string[]) => ipcRenderer.invoke('sendCampaign', template, recipients),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update')
})
