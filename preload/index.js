"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    startGoogleOAuth: () => electron_1.ipcRenderer.invoke('startGoogleOAuth'),
    refreshGoogleToken: (refreshToken) => electron_1.ipcRenderer.invoke('refreshGoogleToken', refreshToken),
    selectFile: () => electron_1.ipcRenderer.invoke('selectFile'),
    checkForUpdates: () => electron_1.ipcRenderer.invoke('checkForUpdates'),
    downloadUpdate: () => electron_1.ipcRenderer.invoke('downloadUpdate')
});
