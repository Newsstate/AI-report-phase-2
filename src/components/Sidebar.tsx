'use client'
import { useStore } from '@/store'
import type { NavTab } from '@/types'
import clsx from 'clsx'

const NAV: { id: NavTab; icon: string; label: string }[] = [
  { id: 'generate', icon: '▸',  label: 'Generate Report' },
  { id: 'connect',  icon: '⊕',  label: 'Connect Data' },
  { id: 'upload',   icon: '↑',  label: 'Upload Files' },
  { id: 'prompt',   icon: '≡',  label: 'Master Prompt' },
  { id: 'history',  icon: '◷',  label: 'History' },
]

export function Sidebar() {
  const { activeTab, setActiveTab, googleToken, uploadedFiles } = useStore()
  return (
    <nav className="w-16 fixed top-0 left-0 bottom-0 z-50 flex flex-col items-center py-5 gap-1.5"
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-[13px] mb-4 cursor-pointer shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1F3A6E, #2E5FA3)' }}
        onClick={() => setActiveTab('generate')}
      >WB</div>
      {NAV.map(item => (
        <NavBtn key={item.id} {...item} active={activeTab === item.id}
          badge={item.id === 'upload' && uploadedFiles.length > 0 ? uploadedFiles.length : undefined}
          onClick={() => setActiveTab(item.id)} />
      ))}
      <div className="mt-auto flex flex-col items-center gap-1.5 mb-3">
       <Dot on={true} color="#16A34A" title="Claude API (configured)" />
        <Dot on={!!googleToken} color="#2E5FA3" title="Google" />
        <NavBtn id="settings" icon="⚙" label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </div>
    </nav>
  )
}

function Dot({ on, color, title }: { on: boolean; color: string; title: string }) {
  return <div className="w-1.5 h-1.5 rounded-full transition-colors" style={{ background: on ? color : 'rgba(255,255,255,0.15)' }} title={title} />
}

function NavBtn({ icon, label, active, onClick, badge }: { id: NavTab; icon: string; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick} title={label}
      className={clsx('relative w-10 h-10 rounded-xl flex items-center justify-center text-base transition-all duration-150 group cursor-pointer border-0',
        active ? 'text-white' : 'text-[#8FA3BF] hover:text-white hover:bg-white/5')}
      style={active ? { background: 'rgba(46,95,163,0.35)', color: 'white' } : {}}>
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center" style={{ background: '#2E5FA3' }}>{badge}</span>
      )}
      <span className="absolute left-12 text-xs px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border"
        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>{label}</span>
    </button>
  )
}
