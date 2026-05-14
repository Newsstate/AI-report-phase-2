'use client'

import { useState } from 'react'
import { useStore } from '@/store'
import {
  getUserInfo, listGSCProperties,
  listGA4Properties, fetchGoogleSheet,
  GA4_METRICS, GSC_METRICS,
} from '@/lib/googleApi'
import { Button, Card, CardTitle, Field, Input, Textarea, SectionHeader } from './ui'

export function ConnectPanel() {
  const store = useStore()
  const [sheetLoading, setSheetLoading] = useState(false)
  const [ga4Loading, setGa4Loading] = useState(false)

  // ── Google OAuth ──────────────────────────────────────────────────────────
  async function handleConnect() {
    try {
      const res = await fetch('/api/auth/google')
      const { url, error } = await res.json()
      if (error || !url) { alert('OAuth not configured on server.'); return }
      window.location.href = url
    } catch {
      alert('Failed to initiate Google sign-in.')
    }
  }

  // Handle OAuth callback token from URL hash (set by /api/auth/callback)
  // This is called once on mount via useEffect in ClientRoot

  function handleDisconnect() {
    store.setGoogleToken(null); store.setGoogleEmail('')
    store.setGscProperties([]); store.setGa4Properties([])
    store.setGscData(null); store.setGa4Data(null)
    store.setKwData([]); store.setSheetData(null)
    store.addLog('Google disconnected.', 'warn')
  }

  async function handleFetchSheet() {
    if (!store.googleToken) { store.addLog('Connect Google first.', 'warn'); return }
    const sheetId = store.config.sheetId.trim()
    if (!sheetId) { store.addLog('Enter a Google Sheet ID or URL.', 'warn'); return }
    const id = sheetId.includes('/d/') ? sheetId.split('/d/')[1].split('/')[0] : sheetId
    setSheetLoading(true)
    try {
      const data = await fetchGoogleSheet(store.googleToken, id)
      store.setSheetData(data)
      store.addLog(`Sheet loaded: "${data.sheetName}" — ${data.rows.length} rows`, 'ok')
    } catch (e: unknown) {
      store.addLog('Sheet error: ' + (e instanceof Error ? e.message : String(e)), 'err')
    } finally { setSheetLoading(false) }
  }

  // ── Metric toggle helpers ─────────────────────────────────────────────────
  function toggleGa4Metric(key: string) {
    const current = store.config.ga4Metrics || []
    const updated = current.includes(key) ? current.filter(k => k !== key) : [...current, key]
    store.setConfig({ ga4Metrics: updated })
  }

  function toggleGscMetric(key: string) {
    const current = store.config.gscMetrics || []
    const updated = current.includes(key) ? current.filter(k => k !== key) : [...current, key]
    store.setConfig({ gscMetrics: updated })
  }

  const { googleToken, googleEmail, gscProperties, ga4Properties, config, sheetData } = store

  const selectStyle = {
    background: 'var(--bg-base)', borderColor: 'var(--border)',
    color: 'var(--text-primary)', width: '100%',
    padding: '10px 14px', fontSize: 14, borderRadius: 8,
    border: '1px solid var(--border)', outline: 'none',
  }

  const stepCard = (n: number, title: string, body: React.ReactNode) => (
    <div key={n} className="flex gap-4 items-start p-3.5 rounded-xl border"
      style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
        style={{ background: 'var(--accent-blue)' }}>{n}</div>
      <div>
        <div className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>{title}</div>
        <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</div>
      </div>
    </div>
  )

  return (
    <div>
      <SectionHeader
        title="Connect Data Sources"
        subtitle="Connect Google for live Search Console and GA4 data. Select which metrics to fetch for each source."
      />

      {/* ── GOOGLE OAUTH ── */}
      <Card>
        <CardTitle>Google OAuth (Search Console + GA4 + Sheets)</CardTitle>

        {!googleToken ? (
          <>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              Click below to securely connect your Google account. You&apos;ll get access to Search Console, GA4, and Google Sheets.
            </p>
            <button onClick={handleConnect}
              className="flex items-center gap-3 px-5 py-2.5 rounded-lg font-semibold text-sm border cursor-pointer transition-all"
              style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Connect with Google
            </button>
          </>
        ) : (
          <div>
            {/* Connected status */}
            <div className="flex items-center gap-4 p-4 rounded-xl border mb-5"
              style={{ background: 'rgba(22,163,74,0.06)', borderColor: 'rgba(22,163,74,0.25)' }}>
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--green)' }} />
              <div className="flex-1">
                <div className="font-semibold text-sm" style={{ color: 'var(--green)' }}>Google Connected</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{googleEmail}</div>
              </div>
              <Button variant="danger" size="sm" onClick={handleDisconnect}>Disconnect</Button>
            </div>

            {/* Property selectors side by side */}
            <div className="grid grid-cols-2 gap-4 mb-2">
              {/* GSC Property dropdown */}
              <Field label="Search Console Property">
                {gscProperties.length > 0 ? (
                  <select value={config.gscProperty}
                    onChange={e => store.setConfig({ gscProperty: e.target.value })}
                    style={selectStyle}>
                    {gscProperties.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <Input value={config.gscProperty}
                    onChange={e => store.setConfig({ gscProperty: e.target.value })}
                    placeholder="https://whitebunnie.com/" />
                )}
              </Field>

              {/* GA4 Property dropdown */}
              <Field label="GA4 Property">
                {ga4Loading ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm"
                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
                    Loading properties...
                  </div>
                ) : ga4Properties.length > 0 ? (
                  <select value={config.ga4PropertyId}
                    onChange={e => store.setConfig({ ga4PropertyId: e.target.value })}
                    style={selectStyle}>
                    {ga4Properties.map(p => (
                      <option key={p.propertyId} value={p.propertyId}>
                        {p.displayName} ({p.propertyId})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input value={config.ga4PropertyId}
                    onChange={e => store.setConfig({ ga4PropertyId: e.target.value })}
                    placeholder="e.g. 362126245" />
                )}
              </Field>
            </div>
          </div>
        )}
      </Card>

      {/* ── GA4 METRIC SELECTION ── */}
      <Card>
        <CardTitle>GA4 Metrics to Fetch</CardTitle>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Select which GA4 metrics to include in the report. Only selected metrics are fetched from the API and sent to Claude.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {GA4_METRICS.map(m => {
            const selected = (config.ga4Metrics || []).includes(m.key)
            return (
              <button key={m.key}
                onClick={() => toggleGa4Metric(m.key)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer text-xs font-medium"
                style={{
                  borderColor: selected ? 'var(--accent-blue)' : 'var(--border)',
                  background:  selected ? 'var(--accent-light)' : 'var(--bg-base)',
                  color:       selected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}>
                <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                  style={{
                    borderColor: selected ? 'var(--accent-blue)' : 'var(--border)',
                    background:  selected ? 'var(--accent-blue)' : 'transparent',
                  }}>
                  {selected && (
                    <svg width="8" height="7" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                {m.label}
              </button>
            )
          })}
        </div>
        <div className="flex gap-3 mt-3">
          <Button variant="ghost" size="sm"
            onClick={() => store.setConfig({ ga4Metrics: GA4_METRICS.map(m => m.key) })}>
            Select All
          </Button>
          <Button variant="ghost" size="sm"
            onClick={() => store.setConfig({ ga4Metrics: GA4_METRICS.filter(m => m.default).map(m => m.key) })}>
            Reset Default
          </Button>
          <span className="ml-auto text-xs self-center" style={{ color: 'var(--text-muted)' }}>
            {(config.ga4Metrics || []).length} selected
          </span>
        </div>
      </Card>

      {/* ── GSC METRIC SELECTION ── */}
      <Card>
        <CardTitle>Search Console Metrics to Fetch</CardTitle>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          All 4 GSC metrics are available. Toggle which ones appear in the report.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {GSC_METRICS.map(m => {
            const selected = (config.gscMetrics || []).includes(m.key)
            return (
              <button key={m.key}
                onClick={() => toggleGscMetric(m.key)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer text-xs font-medium"
                style={{
                  borderColor: selected ? 'var(--accent-blue)' : 'var(--border)',
                  background:  selected ? 'var(--accent-light)' : 'var(--bg-base)',
                  color:       selected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}>
                <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                  style={{
                    borderColor: selected ? 'var(--accent-blue)' : 'var(--border)',
                    background:  selected ? 'var(--accent-blue)' : 'transparent',
                  }}>
                  {selected && (
                    <svg width="8" height="7" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                {m.label}
              </button>
            )
          })}
        </div>
        <div className="flex gap-3 mt-3">
          <Button variant="ghost" size="sm"
            onClick={() => store.setConfig({ gscMetrics: GSC_METRICS.map(m => m.key) })}>
            Select All
          </Button>
          <span className="ml-auto text-xs self-center" style={{ color: 'var(--text-muted)' }}>
            {(config.gscMetrics || []).length} of {GSC_METRICS.length} selected
          </span>
        </div>
      </Card>

      {/* ── GOOGLE SHEETS ── */}
      <Card>
        <CardTitle>Google Sheets (Optional — Backlink Tracker etc.)</CardTitle>
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Field label="Sheet ID or URL">
              <Input value={config.sheetId} onChange={e => store.setConfig({ sheetId: e.target.value })}
                placeholder="https://docs.google.com/spreadsheets/d/ABC123..." />
            </Field>
          </div>
          <div className="flex items-end">
            <Button onClick={handleFetchSheet} disabled={sheetLoading || !googleToken} variant="ghost">
              {sheetLoading ? 'Loading...' : 'Fetch Sheet'}
            </Button>
          </div>
        </div>
        {!googleToken && (
          <p className="text-xs" style={{ color: 'var(--orange)' }}>Connect Google first.</p>
        )}
        {sheetData && (
          <div className="p-4 rounded-xl border"
            style={{ background: 'rgba(22,163,74,0.06)', borderColor: 'rgba(22,163,74,0.2)' }}>
            <div className="font-semibold text-sm mb-1" style={{ color: 'var(--green)' }}>
              Sheet loaded: &quot;{sheetData.sheetName}&quot;
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {sheetData.rows.length} rows · {sheetData.headers.length} columns: {sheetData.headers.join(', ')}
            </div>
          </div>
        )}
      </Card>

      {/* ── MANUAL DATA ── */}
      <Card>
        <CardTitle>Manual Data Entry (No API needed)</CardTitle>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Paste raw numbers if you don&apos;t have live API access. Claude uses these values directly.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Search Console Data">
            <Textarea rows={4} value={store.manualGsc}
              onChange={e => store.setManualData('manualGsc', e.target.value)}
              placeholder={`Clicks: 193\nImpressions: 72767\nCTR: 0.27%\nAvg Position: 27.67`} />
          </Field>
          <Field label="GA4 Data">
            <Textarea rows={4} value={store.manualGa4}
              onChange={e => store.setManualData('manualGa4', e.target.value)}
              placeholder={`Sessions: 804\nUsers: 584\nEngagement Rate: 42.41%`} />
          </Field>
          <Field label="Keyword Rankings">
            <Textarea rows={4} value={store.manualKeywords}
              onChange={e => store.setManualData('manualKeywords', e.target.value)}
              placeholder={`Keyword, Rank, Prev\nseo agency noida, 7, 8`} />
          </Field>
          <Field label="Additional Notes">
            <Textarea rows={4} value={store.manualNotes}
              onChange={e => store.setManualData('manualNotes', e.target.value)}
              placeholder={`- New service page launched\n- Google core update Apr 30`} />
          </Field>
        </div>
      </Card>
    </div>
  )
}
