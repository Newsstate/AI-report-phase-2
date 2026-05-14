'use client'
import { ReactNode } from 'react'
import clsx from 'clsx'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-xl border p-5 mb-4', className)}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, icon }: { children: ReactNode; icon?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon && <span className="text-base" style={{ color: 'var(--accent-blue)' }}>{icon}</span>}
      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{children}</span>
    </div>
  )
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-1 h-6 rounded-full" style={{ background: 'var(--accent-blue)' }} />
        <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {subtitle && <p className="text-sm ml-4" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={clsx('w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all', className)}
      style={{
        background: 'var(--bg-base)', borderColor: 'var(--border)',
        color: 'var(--text-primary)',
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  )
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={clsx('w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all resize-y font-mono', className)}
      style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)', minHeight: 100 }}
      onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  )
}

type BtnVariant = 'primary' | 'ghost' | 'accent' | 'danger'
export function Button({ children, variant = 'ghost', size = 'md', className, disabled, onClick, style }: {
  children: ReactNode; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'
  className?: string; disabled?: boolean; onClick?: () => void; style?: React.CSSProperties
}) {
  const base = 'inline-flex items-center gap-2 font-semibold rounded-lg border cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-2.5 text-sm' }
  const styles: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: 'var(--accent-navy)', color: '#fff', borderColor: 'var(--accent-navy)' },
    accent:  { background: 'var(--accent-blue)', color: '#fff', borderColor: 'var(--accent-blue)' },
    ghost:   { background: 'var(--accent-light)', color: 'var(--accent-blue)', borderColor: 'var(--border)' },
    danger:  { background: 'rgba(220,38,38,0.1)', color: '#DC2626', borderColor: 'rgba(220,38,38,0.2)' },
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={clsx(base, sizes[size], className)}
      style={{ ...styles[variant], ...style }}>
      {children}
    </button>
  )
}

export function CheckboxRow({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg cursor-pointer border mb-2 transition-all"
      style={{ borderColor: checked ? 'var(--accent-blue)' : 'var(--border)', background: checked ? 'var(--accent-light)' : 'transparent' }}>
      <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
        style={{ borderColor: checked ? 'var(--accent-blue)' : 'var(--border)', background: checked ? 'var(--accent-blue)' : 'transparent' }}
        onClick={() => onChange(!checked)}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{description}</div>
      </div>
    </label>
  )
}

export function DataTable({ headers, rows }: { headers: string[]; rows: (string | ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ background: 'var(--accent-navy)' }}>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide"
                style={{ color: '#fff', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'var(--row-alt)' : 'var(--bg-card)' }}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ChangeBadge({ current, previous, lowerBetter }: { current: number; previous: number; lowerBetter?: boolean }) {
  if (!previous) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const good = lowerBetter ? pct < 0 : pct > 0
  const col = good ? 'var(--green)' : 'var(--red)'
  const arrow = pct > 0 ? '↑' : '↓'
  return <span style={{ color: col, fontWeight: 600 }}>{arrow}{Math.abs(pct).toFixed(1)}%</span>
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div className="animate-spin rounded-full border-2 border-t-transparent shrink-0"
      style={{ width: size, height: size, borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
  )
}

export function ProgressBar({ progress, label }: { progress: number; label: string }) {
  if (!progress) return null
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        <span>{label}</span><span>{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent-navy), var(--accent-blue))' }} />
      </div>
    </div>
  )
}

export function Pill({ children, color }: { children: ReactNode; color: 'green' | 'blue' | 'orange' | 'red' }) {
  const colors = {
    green:  { bg: 'rgba(22,163,74,0.12)',  text: 'var(--green)' },
    blue:   { bg: 'var(--accent-light)',   text: 'var(--accent-blue)' },
    orange: { bg: 'rgba(217,119,6,0.12)',  text: 'var(--orange)' },
    red:    { bg: 'rgba(220,38,38,0.12)',  text: 'var(--red)' },
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: colors[color].bg, color: colors[color].text }}>
      {children}
    </span>
  )
}
