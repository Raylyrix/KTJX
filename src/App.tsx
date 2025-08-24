import React, { useState, useEffect } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { CampaignProvider } from './contexts/CampaignContext'
import { Toaster } from 'react-hot-toast'
import TabManager from './components/TabManager'
import Sidebar from './components/Sidebar'
import Header from './components/Header'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ThemeProvider>
      <AuthProvider>
        <CampaignProvider>
          <div className="h-screen flex flex-col bg-background">
            <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            
            <div className="flex flex-1 overflow-hidden">
              <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              
              <main className="flex-1 overflow-hidden">
                <TabManager />
              </main>
            </div>
          </div>
          
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </CampaignProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
