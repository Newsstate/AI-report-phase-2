'use client'

import { useStore, DEFAULT_PROMPT } from '@/store'
import { Button, Card, CardTitle, Field, Input, Textarea, SectionHeader, Pill } from './ui'
import type { ScheduleEntry } from '@/types'
import { useState } from 'react'

// ── SETTINGS ─────────────────────────────────────────────────────────────────
export function SettingsPanel() {
  const { settings, setSettings, addLog } = useStore()

  const inputStyle = { background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

  return (
    <div>
      <SectionHeader title="Settings" subtitle="Configure model and output preferences." />

      {/* CLAUDE MODEL */}
      <Card>
        <CardTitle>Claude Model & Output</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Model">
            <select
              value={settings.model}
              onChange={e => setSettings({ model: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border outline-none"
              style={inputStyle}>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6 (Recommended)</option>
              <option value="claude-opus-4-6">claude-opus-4-6 (Best quality)</option>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 (Fastest)</option>
            </select>
          </Field>
          <Field label="Max Output Tokens">
            <select
              value={settings.maxTokens}
              onChange={e => setSettings({ maxTokens: parseInt(e.target.value) })}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border outline-none"
              style={inputStyle}>
              <option value={2000}>2,000 — Short reports</option>
              <option value={4000}>4,000 — Standard</option>
              <option value={6000}>6,000 — Detailed</option>
              <option value={8000}>8,000 — Full reports</option>
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Button variant="ghost" onClick={() => addLog('Settings saved.', 'ok')}>Save Settings</Button>
        </div>
      </Card>

      {/* FEATURE SUMMARY */}
      <Card>
        <CardTitle>Features — v6.0</CardTitle>
        <div className="grid grid-cols-2 gap-2">
          {[
            'Live Search Console (OAuth)',
            'Live GA4 Analytics (OAuth)',
            'Google Sheets integration',
            'Keyword PDF upload (Claude reads it)',
            'PDF export (browser print)',
            'Word DOCX export — WB branded',
            'File uploads: PDF, Excel, Word, images',
            'Claude Vision for screenshots',
            'Light / Dark theme toggle',
            'Report history & reload',
            'Scheduled reports per client',
            'Fully local — no backend needed',
          ].map((label, i) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--green)' }}>✓</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── PROMPT ────────────────────────────────────────────────────────────────────
export function PromptPanel() {
  const { masterPrompt, setMasterPrompt, addLog } = useStore()
  const VARS = [
    ['{{CLIENT_NAME}}', 'Client name'],
    ['{{CLIENT_URL}}', 'Website URL'],
    ['{{DATE_FROM}} / {{DATE_TO}}', 'Report period'],
    ['{{PREV_FROM}} / {{PREV_TO}}', 'Comparison period'],
    ['{{GSC_DATA}}', 'Live Search Console data'],
    ['{{GA4_DATA}}', 'Live GA4 data'],
    ['{{KW_DATA}}', 'GSC keyword rankings'],
    ['{{UPLOADS_DATA}}', 'Uploaded files (keyword PDFs etc.)'],
    ['{{SHEETS_DATA}}', 'Google Sheets data'],
    ['{{MANUAL_DATA}}', 'Manual notes / CSV paste'],
    ['{{SECTIONS}}', 'Selected report sections'],
  ]
  return (
    <div>
      <SectionHeader title="Master Prompt" subtitle="The system prompt sent to Claude. Customise to match your reporting style." />
      <Card>
        <CardTitle>System Prompt</CardTitle>
        <Textarea
          value={masterPrompt}
          onChange={e => setMasterPrompt(e.target.value)}
          rows={22}
          className="font-mono text-xs leading-relaxed"
        />
        <div className="flex gap-3 mt-4">
          <Button variant="accent" onClick={() => addLog('Prompt saved.', 'ok')}>Save</Button>
          <Button variant="ghost" onClick={() => setMasterPrompt(DEFAULT_PROMPT)}>Reset Default</Button>
        </div>
      </Card>
      <Card>
        <CardTitle>Template Variables</CardTitle>
        <div className="grid grid-cols-2 gap-2">
          {VARS.map(([v, d]) => (
            <div key={v} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
              <code className="text-xs font-mono shrink-0" style={{ color: 'var(--accent-teal)' }}>{v}</code>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>→ {d}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── SCHEDULE ──────────────────────────────────────────────────────────────────
export function SchedulePanel() {
  const { schedules, addSchedule, removeSchedule } = useStore()
  const [form, setForm] = useState({
    client: '', url: '', ga4: '',
    freq: 'weekly' as ScheduleEntry['freq'], day: 'Monday',
  })

  function getNextRun(day: string) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const target = days.indexOf(day)
    const now = new Date()
    const diff = (target - now.getDay() + 7) % 7 || 7
    const next = new Date(now); next.setDate(now.getDate() + diff)
    return next.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }

  const selectStyle = { background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

  return (
    <div>
      <SectionHeader title="Scheduled Reports" subtitle="Automate report generation for each client on a recurring basis." />
      <Card>
        <CardTitle>Add Schedule</CardTitle>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Client Name"><Input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="White Bunnie" /></Field>
          <Field label="GSC Property"><Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://whitebunnie.com/" /></Field>
          <Field label="GA4 Property ID"><Input value={form.ga4} onChange={e => setForm(f => ({ ...f, ga4: e.target.value }))} placeholder="362126245" /></Field>
          <Field label="Frequency">
            <select value={form.freq} onChange={e => setForm(f => ({ ...f, freq: e.target.value as ScheduleEntry['freq'] }))}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border outline-none" style={selectStyle}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
          <Field label="Day">
            <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border outline-none" style={selectStyle}>
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label=" ">
            <Button onClick={() => {
              if (!form.client.trim()) return
              addSchedule(form)
              setForm({ client: '', url: '', ga4: '', freq: 'weekly', day: 'Monday' })
            }} className="w-full">Add</Button>
          </Field>
        </div>
      </Card>
      <Card>
        <CardTitle>Active Schedules ({schedules.length})</CardTitle>
        {!schedules.length ? (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>No schedules yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: 'var(--accent-navy)' }}>
                  {['Client','Property','Frequency','Next Run',''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#fff' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedules.map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? 'var(--row-alt)' : 'var(--bg-card)' }}>
                    <td className="px-4 py-3 font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{s.client}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{s.url || '—'}</td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--text-primary)' }}>{s.freq}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-primary)' }}>{getNextRun(s.day)}</td>
                    <td className="px-4 py-3">
                      <Button variant="danger" size="sm" onClick={() => removeSchedule(s.id)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
export function HistoryPanel() {
  const { history, loadHistory } = useStore()
  return (
    <div>
      <SectionHeader title="Report History" subtitle="All reports saved in this browser session." />
      {!history.length ? (
        <Card><p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No reports saved yet.</p></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {history.map(e => (
            <div key={e.id} onClick={() => loadHistory(e.id)}
              className="rounded-xl p-5 cursor-pointer border transition-all"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              onMouseEnter={el => (el.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onMouseLeave={el => (el.currentTarget.style.borderColor = 'var(--border)')}>
              <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{e.client}</div>
              <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                {e.dateFrom} → {e.dateTo} · {new Date(e.savedAt).toLocaleDateString()}
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full border" style={{ background: 'var(--accent-light)', color: 'var(--accent-blue)', borderColor: 'var(--border)' }}>
                  {e.format.toUpperCase()}
                </span>
                {e.hadLiveData && <Pill color="green">Live Data</Pill>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
