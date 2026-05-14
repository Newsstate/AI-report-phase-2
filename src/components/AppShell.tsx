'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { GeneratePanel } from './GeneratePanel'
import { ConnectPanel } from './ConnectPanel'
import { UploadPanel } from './UploadPanel'
import { SettingsPanel, PromptPanel, SchedulePanel, HistoryPanel } from './OtherPanels'

export function AppShell() {
  const { activeTab, _hasHydrated, theme } = useStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    useStore.persist.rehydrate()
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) document.documentElement.setAttribute('data-theme', theme)
  }, [theme, mounted])

  if (!mounted || !_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#080E1A' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-xl mx-auto mb-4 animate-pulse"
            style={{ background: 'linear-gradient(135deg,#1F3A6E,#2E5FA3)' }}>WB</div>
          <p className="text-sm" style={{ color: '#6B7E99' }}>Loading SEO Report Generator v6...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />
      <div className="flex-1 ml-16 flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 p-6" style={{ maxWidth: '1100px' }}>
          {activeTab === 'generate' && <GeneratePanel />}
          {activeTab === 'connect'  && <ConnectPanel />}
          {activeTab === 'upload'   && <UploadPanel />}
          {activeTab === 'schedule' && <SchedulePanel />}
          {activeTab === 'prompt'   && <PromptPanel />}
          {activeTab === 'history'  && <HistoryPanel />}
          {activeTab === 'settings' && <SettingsPanel />}
        </main>
      </div>
    </div>
  )
}
