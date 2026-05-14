'use client'
import { useStore } from '@/store'

export function TopBar() {
  const { settings, googleToken, googleEmail, theme, toggleTheme } = useStore()
  return (
    <div className="h-14 flex items-center px-6 gap-4 sticky top-0 z-40 border-b"
      style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
      <div style={{ color: 'var(--accent-navy)' }}>
        <span className="font-bold text-base">SEO Report Generator</span>
        <span className="ml-2 text-xs font-mono opacity-50">v6.0</span>
      </div>

      <span className="text-xs font-semibold px-2.5 py-1 rounded-full border ml-1"
        style={{ background: 'var(--accent-light)', color: 'var(--accent-blue)', borderColor: 'var(--border)' }}>
        Whitebunnie Digital
      </span>

      <div className="flex items-center gap-3 ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>
        <StatusDot on={!!settings.anthropicKey} label={settings.anthropicKey ? 'Claude' : 'No API Key'} color="var(--green)" />
        <StatusDot on={!!googleToken} label={googleToken ? (googleEmail || 'Google') : 'No Google'} color="var(--accent-blue)" />
      </div>

      {/* Theme toggle */}
      <button onClick={toggleTheme}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-all cursor-pointer"
        style={{ background: 'var(--accent-light)', borderColor: 'var(--border)', color: 'var(--accent-navy)' }}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? '☀' : '◑'}
      </button>
    </div>
  )
}

function StatusDot({ on, label, color }: { on: boolean; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? color : 'var(--border)' }} />
      <span style={{ color: on ? color : 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}
