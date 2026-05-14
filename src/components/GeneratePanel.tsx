'use client'
import { useStore } from '@/store'
import { Button, Card, CardTitle, Field, Input, CheckboxRow, SectionHeader, DataTable, ChangeBadge, Spinner, ProgressBar, Pill } from './ui'
import { buildPrompt } from '@/lib/promptBuilder'
import { exportReport } from '@/lib/reportExport'
import { fetchGSCSummary, fetchGSCKeywords, fetchGA4Summary } from '@/lib/googleApi'
import type { GscMetricKey, Ga4MetricKey } from '@/lib/googleApi'
import { buildClaudeMessages } from '@/lib/fileProcessor'
import type { OutputFormat } from '@/types'
import clsx from 'clsx'

const FORMAT_OPTIONS: { id: OutputFormat; icon: string; label: string; desc: string }[] = [
  { id: 'docx', icon: '▣', label: 'Word (.docx)', desc: 'Branded editable document' },
  { id: 'pdf',  icon: '▤', label: 'PDF',          desc: 'Print-ready via browser' },
]

export function GeneratePanel() {
  const store = useStore()

  async function handleFetchGSC() {
    if (!store.googleToken) { store.addLog('Connect Google first.', 'warn'); store.setActiveTab('connect'); return }
    const prop = store.config.gscProperty
    if (!prop) { store.addLog('Enter GSC property URL.', 'warn'); return }
    store.setIsFetching('gsc', true); store.setIsFetching('kw', true)
    store.addLog(`Fetching Search Console for ${prop}...`, 'info')
    store.setProgress(15, 'Fetching Search Console...')
    try {
      const [summary, kw] = await Promise.all([
        fetchGSCSummary(store.googleToken, prop, store.config.dateFrom, store.config.dateTo, store.config.prevFrom, store.config.prevTo, (store.config.gscMetrics || []) as GscMetricKey[]),
        fetchGSCKeywords(store.googleToken, prop, store.config.dateFrom, store.config.dateTo, store.config.prevFrom, store.config.prevTo),
      ])
      store.setGscData(summary); store.setKwData(kw)
      store.addLog(`GSC fetched: ${summary.clicks} clicks, ${summary.impressions.toLocaleString()} impressions, pos ${summary.position.toFixed(1)}`, 'ok')
      store.addLog(`Keywords: ${kw.length} queries`, 'ok')
      store.setProgress(50, 'Search Console ready.')
    } catch (e: unknown) {
      store.addLog('GSC error: ' + (e instanceof Error ? e.message : String(e)), 'err')
    } finally { store.setIsFetching('gsc', false); store.setIsFetching('kw', false) }
  }

  async function handleFetchGA4() {
    if (!store.googleToken) { store.addLog('Connect Google first.', 'warn'); return }
    const propId = store.config.ga4PropertyId
    if (!propId) { store.addLog('Enter GA4 Property ID.', 'warn'); return }
    store.setIsFetching('ga4', true)
    store.addLog(`Fetching GA4 property ${propId}...`, 'info')
    store.setProgress(30, 'Fetching GA4...')
    try {
      const data = await fetchGA4Summary(store.googleToken, propId, store.config.dateFrom, store.config.dateTo, store.config.prevFrom, store.config.prevTo, (store.config.ga4Metrics || []) as Ga4MetricKey[])
      store.setGa4Data(data)
      store.addLog(`GA4 fetched: ${Math.round(data.current.sessions)} sessions, ${Math.round(data.current.users)} users`, 'ok')
      store.setProgress(80, 'GA4 ready.')
    } catch (e: unknown) {
      store.addLog('GA4 error: ' + (e instanceof Error ? e.message : String(e)), 'err')
    } finally { store.setIsFetching('ga4', false) }
  }

  async function handleFetchAll() {
    if (!store.googleToken) { store.addLog('Connect Google first.', 'warn'); store.setActiveTab('connect'); return }
    store.clearLogs(); store.addLog('Fetching all live data...', 'info')
    await Promise.all([handleFetchGSC(), handleFetchGA4()])
    store.setProgress(100, 'All data ready!'); store.addLog('All data fetched successfully.', 'ok')
  }

  async function handleGenerate() {
    if (!store.config.clientName.trim()) { store.addLog('Enter a client name.', 'warn'); return }
    store.clearLogs(); store.setIsGenerating(true); store.setGeneratedReport(''); store.setProgress(10, 'Building prompt...')
    try {
      const prompt = buildPrompt(
        store.masterPrompt, store.config,
        store.gscData, store.ga4Data, store.kwData,
        store.sheetData, store.manualGsc, store.manualGa4,
        store.manualKeywords, store.manualNotes, store.uploadedFiles
      )
      const hasLive = !!(store.gscData || store.ga4Data)
      store.addLog(hasLive ? 'Live data injected into prompt.' : 'No live data — using manual/uploaded data.', hasLive ? 'ok' : 'warn')
      if (store.uploadedFiles.length) store.addLog(`${store.uploadedFiles.length} file(s) attached for Claude to analyse.`, 'info')
      store.setProgress(25, 'Sending to Claude...')

      const messages = buildClaudeMessages(prompt, store.uploadedFiles)
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: store.settings.model, max_tokens: store.settings.maxTokens, messages }),
      })
      store.setProgress(75, 'Receiving response...')
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`API ${res.status}: ${e.error?.message || res.statusText}`) }
      const data = await res.json()
      const content = data.content?.[0]?.text || ''
      if (!content) throw new Error('Empty response from Claude.')
      store.setGeneratedReport(content)
      store.setProgress(100, 'Report ready!')
      store.addLog(`Done. ${data.usage?.input_tokens ?? '?'} input + ${data.usage?.output_tokens ?? '?'} output tokens.`, 'ok')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      store.addLog('Error: ' + msg, 'err')
      if (msg.includes('401')) store.addLog('Authentication error — contact administrator.', 'warn')
      if (msg.includes('429')) store.addLog('Rate limited. Wait and retry.', 'warn')
      store.setProgress(0, '')
    } finally { store.setIsGenerating(false) }
  }

  function handleSave() {
    store.addHistory({ id: Date.now(), client: store.config.clientName, dateFrom: store.config.dateFrom, dateTo: store.config.dateTo, format: store.config.outputFormat, hadLiveData: !!(store.gscData || store.ga4Data), report: store.generatedReport, savedAt: new Date().toISOString() })
    store.addLog('Saved to history.', 'ok')
  }

  const { config, gscData, ga4Data, kwData, isFetching, uploadedFiles } = store

  return (
    <div>
      <SectionHeader title="Generate SEO Report" subtitle="Connect live Google data, upload keyword PDFs, then generate a branded report." />

      {/* DATA SOURCE STATUS */}
      <Card>
        <CardTitle>Live Data Sources</CardTitle>
        <div className="flex gap-2 flex-wrap mb-3">
          {[
            { key: 'gsc' as const, label: 'Search Console', fetching: isFetching.gsc, data: !!gscData, onClick: handleFetchGSC },
            { key: 'ga4' as const, label: 'GA4 Analytics',  fetching: isFetching.ga4, data: !!ga4Data, onClick: handleFetchGA4 },
            { key: 'kw'  as const, label: `Keywords (${kwData.length})`, fetching: isFetching.kw, data: kwData.length > 0, onClick: handleFetchGSC },
          ].map(src => (
            <button key={src.key} onClick={src.onClick}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer"
              style={{
                borderColor: src.data ? 'rgba(22,163,74,0.3)' : src.fetching ? 'rgba(217,119,6,0.3)' : 'var(--border)',
                background: src.data ? 'rgba(22,163,74,0.08)' : src.fetching ? 'rgba(217,119,6,0.08)' : 'var(--accent-light)',
                color: src.data ? 'var(--green)' : src.fetching ? 'var(--orange)' : 'var(--text-secondary)',
              }}>
              {src.label}
              {src.fetching && <Spinner size={12} />}
              {src.data && <span style={{ color: 'var(--green)' }}>✓</span>}
            </button>
          ))}
          {uploadedFiles.length > 0 && (
            <button onClick={() => store.setActiveTab('upload')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer"
              style={{ borderColor: 'rgba(46,95,163,0.3)', background: 'var(--accent-light)', color: 'var(--accent-blue)' }}>
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="accent" size="sm" onClick={handleFetchAll}>Fetch All</Button>
            <Button variant="ghost" size="sm" onClick={() => store.setActiveTab('connect')}>Setup Google</Button>
          </div>
        </div>

        {/* Upload prompt */}
        <div className="rounded-lg p-3 border text-xs" style={{ background: 'var(--accent-light)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--accent-navy)' }}>Keyword data:</strong> Upload your Ubersuggest keyword PDF via the Upload tab — Claude will extract all rankings automatically.
        </div>
      </Card>

      {/* DATA PREVIEWS */}
      {gscData && (
        <Card>
          <CardTitle>Search Console — Live Data</CardTitle>
          <DataTable headers={['Metric','Current','Previous','Change']} rows={[
            ['Clicks',      gscData.clicks.toLocaleString(),      gscData.prev.clicks.toLocaleString(),      <ChangeBadge key="c" current={gscData.clicks} previous={gscData.prev.clicks} />],
            ['Impressions', gscData.impressions.toLocaleString(), gscData.prev.impressions.toLocaleString(), <ChangeBadge key="i" current={gscData.impressions} previous={gscData.prev.impressions} />],
            ['CTR',         `${(gscData.ctr*100).toFixed(2)}%`,  `${(gscData.prev.ctr*100).toFixed(2)}%`,  <ChangeBadge key="ctr" current={gscData.ctr} previous={gscData.prev.ctr} />],
            ['Avg Position',gscData.position.toFixed(1),          gscData.prev.position.toFixed(1),          <ChangeBadge key="p" current={gscData.position} previous={gscData.prev.position} lowerBetter />],
          ]} />
        </Card>
      )}
      {ga4Data?.current && (
        <Card>
          <CardTitle>GA4 — Live Data</CardTitle>
          <DataTable headers={['Metric','Current','Previous','Change']}
            rows={(ga4Data.current.selectedMetrics || []).map((key, i) => {
              const curr = ga4Data.current.raw[key] ?? 0
              const prev = ga4Data.previous?.raw[key]
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
              const isRate = key.includes('Rate') || key.includes('rate')
              const fmt = (v: number) => isRate ? `${(v*100).toFixed(2)}%` : Math.round(v).toLocaleString()
              return [
                label,
                fmt(curr),
                prev !== undefined ? fmt(prev) : '—',
                prev !== undefined ? <ChangeBadge key={i} current={curr} previous={prev} lowerBetter={key.includes('bounce') || key.includes('Bounce')} /> : '—',
              ]
            })} />
        </Card>
      )}
      {kwData.length > 0 && (
        <Card>
          <CardTitle>Top Keywords — Live ({kwData.length} total)</CardTitle>
          <DataTable headers={['Keyword','Position','Prev','Change','Clicks','Impressions']}
            rows={kwData.slice(0,8).map(k => {
              const chg = k.prevPos !== null ? k.prevPos - k.position : null
              return [
                <span key="kw" className="font-mono text-xs">{k.keyword}</span>,
                k.position.toFixed(1), k.prevPos ? k.prevPos.toFixed(1) : '—',
                chg !== null
                  ? <span key="c" style={{ color: chg>0 ? 'var(--green)' : chg<0 ? 'var(--red)' : 'var(--text-muted)', fontWeight: 600, fontSize: 12 }}>{chg>0?`↑${chg.toFixed(1)}`:chg<0?`↓${Math.abs(chg).toFixed(1)}`:'—'}</span>
                  : <span key="new" style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: 12 }}>NEW</span>,
                String(k.clicks), k.impressions.toLocaleString(),
              ]
            })} />
        </Card>
      )}

      {/* CLIENT INFO */}
      <Card>
        <CardTitle>Client Information</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client / Brand Name *"><Input value={config.clientName} onChange={e => store.setConfig({ clientName: e.target.value })} placeholder="e.g. White Bunnie" /></Field>
          <Field label="Website URL"><Input value={config.clientUrl} onChange={e => store.setConfig({ clientUrl: e.target.value })} placeholder="e.g. whitebunnie.com" /></Field>
          <Field label="GSC Property URL"><Input value={config.gscProperty} onChange={e => store.setConfig({ gscProperty: e.target.value })} placeholder="https://whitebunnie.com/" /></Field>
          <Field label="GA4 Property ID"><Input value={config.ga4PropertyId} onChange={e => store.setConfig({ ga4PropertyId: e.target.value })} placeholder="e.g. 362126245" /></Field>
          <Field label="Report From"><Input type="date" value={config.dateFrom} onChange={e => store.setConfig({ dateFrom: e.target.value })} /></Field>
          <Field label="Report To"><Input type="date" value={config.dateTo} onChange={e => store.setConfig({ dateTo: e.target.value })} /></Field>
          <Field label="Compare From (optional)"><Input type="date" value={config.prevFrom} onChange={e => store.setConfig({ prevFrom: e.target.value })} /></Field>
          <Field label="Compare To (optional)"><Input type="date" value={config.prevTo} onChange={e => store.setConfig({ prevTo: e.target.value })} /></Field>
        </div>
      </Card>

      {/* SECTIONS */}
      <Card>
        <CardTitle>Report Sections</CardTitle>
        <div className="grid grid-cols-2 gap-x-4">
          <CheckboxRow checked={config.sections.exec}     onChange={v => store.setSections({ exec: v })}     label="Executive Summary"     description="Wins, concerns, insights" />
          <CheckboxRow checked={config.sections.ga4}      onChange={v => store.setSections({ ga4: v })}      label="GA4 Organic Traffic"   description="Sessions, users, engagement" />
          <CheckboxRow checked={config.sections.gsc}      onChange={v => store.setSections({ gsc: v })}      label="Search Console"        description="Clicks, impressions, CTR, position" />
          <CheckboxRow checked={config.sections.keywords} onChange={v => store.setSections({ keywords: v })} label="Keyword Rankings"      description="From uploaded PDF or GSC data" />
          <CheckboxRow checked={config.sections.authority}onChange={v => store.setSections({ authority: v })}label="Website Authority"     description="DA, backlinks, referring domains" />
          <CheckboxRow checked={config.sections.plan}     onChange={v => store.setSections({ plan: v })}     label="KPI Targets & Plan"    description="30-day targets table" />
        </div>
      </Card>

      {/* OUTPUT FORMAT */}
      <Card>
        <CardTitle>Download Format</CardTitle>
        <div className="flex gap-3">
          {FORMAT_OPTIONS.map(f => (
            <button key={f.id} onClick={() => store.setConfig({ outputFormat: f.id })}
              className="flex-1 p-4 rounded-xl border-2 text-center transition-all cursor-pointer"
              style={{
                borderColor: config.outputFormat === f.id ? 'var(--accent-blue)' : 'var(--border)',
                background: config.outputFormat === f.id ? 'var(--accent-light)' : 'transparent',
              }}>
              <div className="text-xl mb-2" style={{ color: 'var(--accent-navy)' }}>{f.icon}</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{f.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* ACTIONS */}
      <div className="flex gap-3 items-center mb-4">
        <Button variant="accent" size="lg" onClick={handleGenerate} disabled={store.isGenerating}>
          {store.isGenerating ? <><Spinner size={15} /> Generating...</> : 'Generate with Claude'}
        </Button>
        <Button variant="ghost" onClick={() => store.setActiveTab('upload')}>
          Upload Files
          {uploadedFiles.length > 0 && <Pill color="blue">{uploadedFiles.length}</Pill>}
        </Button>
        <Button variant="ghost" onClick={() => { store.setGscData(null); store.setGa4Data(null); store.setKwData([]); store.clearLogs(); store.setGeneratedReport('') }}>
          Reset
        </Button>
      </div>

      <ProgressBar progress={store.progress} label={store.progressLabel} />

      {/* LOG */}
      <div className="rounded-xl p-4 mt-3 h-32 overflow-y-auto font-mono border"
        style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
        {store.logs.length === 0
          ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>// Ready. Connect data, upload keyword PDF, then Generate.</span>
          : store.logs.map((l, i) => (
            <span key={i} className="log-line" style={{
              color: l.type==='ok' ? 'var(--green)' : l.type==='err' ? 'var(--red)' : l.type==='warn' ? 'var(--orange)' : l.type==='info' ? 'var(--accent-blue)' : l.type==='dim' ? 'var(--text-muted)' : 'var(--text-secondary)'
            }}>[{l.ts}] {l.msg}</span>
          ))}
      </div>

      {/* REPORT OUTPUT */}
      {store.generatedReport && (
        <div className="mt-5 rounded-2xl overflow-hidden border fade-in" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{store.config.clientName} — SEO Report</span>
              <Pill color="green">Ready</Pill>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(store.generatedReport)}>Copy</Button>
              <Button variant="accent" size="sm" onClick={() => exportReport(store.generatedReport, store.config.clientName, 'docx')}>
                Download DOCX
              </Button>
              <Button variant="primary" size="sm" onClick={() => exportReport(store.generatedReport, store.config.clientName, 'pdf')}>
                Download PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSave}>Save</Button>
            </div>
          </div>
          <div className="p-6 max-h-[550px] overflow-y-auto" style={{ background: 'var(--bg-surface)' }}>
            <pre className="text-xs whitespace-pre-wrap leading-relaxed font-mono" style={{ color: 'var(--text-primary)' }}>{store.generatedReport}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
