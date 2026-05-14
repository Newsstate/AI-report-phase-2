import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  NavTab, GSCSummary, GA4Summary, KeywordRow,
  GoogleSheetData, UploadedFile, ReportConfig,
  ScheduleEntry, HistoryEntry, LogEntry, AppSettings
} from '@/types'

const fmt = (d: Date) => d.toISOString().split('T')[0]
function getDefaultDates() {
  const today = new Date()
  const to = new Date(today); to.setDate(to.getDate() - 1)
  const from = new Date(to); from.setDate(from.getDate() - 6)
  const pTo = new Date(from); pTo.setDate(pTo.getDate() - 1)
  const pFrom = new Date(pTo); pFrom.setDate(pFrom.getDate() - 6)
  return { dateFrom: fmt(from), dateTo: fmt(to), prevFrom: fmt(pFrom), prevTo: fmt(pTo) }
}

const defaultConfig: ReportConfig = {
  clientName: '', clientUrl: '', gscProperty: '', ga4PropertyId: '',
  sheetId: '', ubersuggestDomain: '',
  ...getDefaultDates(),
  ga4Metrics: ['sessions','totalUsers','newUsers','engagementRate','bounceRate','averageSessionDuration','screenPageViews'],
  gscMetrics: ['clicks','impressions','ctr','position'],
  sections: { exec: true, ga4: true, gsc: true, keywords: true, sheets: false, ubersuggest: false, uploads: true, authority: true, plan: true },
  outputFormat: 'docx', tone: 'professional',
}

interface AppStore {
  theme: 'light' | 'dark'; toggleTheme: () => void
  activeTab: NavTab; setActiveTab: (t: NavTab) => void
  config: ReportConfig; setConfig: (c: Partial<ReportConfig>) => void
  setSections: (s: Partial<ReportConfig['sections']>) => void
  googleToken: string | null; setGoogleToken: (t: string | null) => void
  googleEmail: string; setGoogleEmail: (e: string) => void
  gscProperties: string[]; setGscProperties: (p: string[]) => void
  ga4Properties: Array<{propertyId: string; displayName: string}>; setGa4Properties: (p: Array<{propertyId: string; displayName: string}>) => void
  gscData: GSCSummary | null; setGscData: (d: GSCSummary | null) => void
  ga4Data: GA4Summary | null; setGa4Data: (d: GA4Summary | null) => void
  kwData: KeywordRow[]; setKwData: (d: KeywordRow[]) => void
  sheetData: GoogleSheetData | null; setSheetData: (d: GoogleSheetData | null) => void
  uploadedFiles: UploadedFile[]; addUploadedFile: (f: UploadedFile) => void
  removeUploadedFile: (id: string) => void; clearUploadedFiles: () => void
  manualGsc: string; manualGa4: string; manualKeywords: string; manualNotes: string
  setManualData: (key: 'manualGsc' | 'manualGa4' | 'manualKeywords' | 'manualNotes', val: string) => void
  generatedReport: string; setGeneratedReport: (r: string) => void
  isGenerating: boolean; setIsGenerating: (v: boolean) => void
  isFetching: { gsc: boolean; ga4: boolean; kw: boolean; sheets: boolean }
  setIsFetching: (key: keyof AppStore['isFetching'], v: boolean) => void
  progress: number; progressLabel: string; setProgress: (p: number, l: string) => void
  logs: LogEntry[]; addLog: (msg: string, type?: LogEntry['type']) => void; clearLogs: () => void
  masterPrompt: string; setMasterPrompt: (p: string) => void
  history: HistoryEntry[]
  addHistory: (e: HistoryEntry) => void; loadHistory: (id: number) => void
  schedules: ScheduleEntry[]
  addSchedule: (s: Omit<ScheduleEntry, 'id' | 'createdAt'>) => void
  removeSchedule: (id: number) => void
  settings: AppSettings; setSettings: (s: Partial<AppSettings>) => void
  _hasHydrated: boolean; setHasHydrated: (v: boolean) => void
}

export const DEFAULT_PROMPT = `You are a senior SEO analyst at a professional digital marketing agency. Your job is to generate a clean, accurate, client-facing SEO performance report using ONLY the data explicitly provided below. You do not guess, estimate, or fill gaps with assumptions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTITY & CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT: {{CLIENT_NAME}}
WEBSITE: {{CLIENT_URL}}
REPORT PERIOD: {{DATE_FROM}} to {{DATE_TO}}
COMPARISON PERIOD: {{PREV_FROM}} to {{PREV_TO}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE DATA RULES — READ BEFORE GENERATING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NEVER invent, estimate, or hallucinate any number, metric, URL, keyword, or name.
2. Copy numbers EXACTLY as provided. Do not round unless the source data is already rounded.
3. If a metric is missing or a section has no data, write exactly: "Data not available for this period." — never skip the section silently.
4. % change must be calculated as: ((Current - Previous) / Previous) × 100. Show + for gains, - for losses. If previous value is 0 or missing, write "N/A" instead of calculating.
5. Use exactly these formatting markers — no others:
   - Section headings: start the line with # (single hash + space), e.g. # EXECUTIVE SUMMARY
   - Sub-headings: start with ## (double hash + space), e.g. ## GA4 Organic Traffic
   - Sub-sub-headings: start with ### (triple hash + space)
   - Bullet points: start with - (hyphen + space)
   - Tables: use pipe | format with a separator row of dashes, e.g. | Col1 | Col2 |
   - Section dividers: use --- on its own line
   - Do NOT use ** bold or * italic anywhere — plain text only inside headings and paragraphs
6. Do not add commentary, tips, or insights that are not directly supported by the data provided.
7. If comparison period dates are empty, report current period data only — do not show % change columns.
8. Source every number — if a metric comes from GA4, label it (GA4). If from GSC, label it (GSC). If from manual input, label it (Manual).
6. Do not add commentary, tips, or insights that are not directly supported by the data provided.
7. If comparison period dates are empty, report current period data only — do not show % change columns.
8. Source every number — if a metric comes from GA4, label it (GA4). If from GSC, label it (GSC). If from manual input, label it (Manual).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE DATA PROVIDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GOOGLE SEARCH CONSOLE DATA (GSC):
{{GSC_DATA}}

GA4 ANALYTICS DATA:
{{GA4_DATA}}

KEYWORD RANKINGS — GSC Queries:
{{KW_DATA}}

UBERSUGGEST KEYWORD DATA:
{{UBERSUGGEST_DATA}}

GOOGLE SHEETS DATA:
{{SHEETS_DATA}}

MANUAL / ADDITIONAL DATA:
{{MANUAL_DATA}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKLINK DATA INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1 — Check GOOGLE SHEETS DATA above first.
  - Scan each row for the client by matching:
      Target URL contains {{CLIENT_URL}}
      OR Project contains {{CLIENT_NAME}}
  - Use exact string match, case-insensitive. Do not include rows for other clients.
  - Filter rows where Date Created falls within {{DATE_FROM}} to {{DATE_TO}} for the report period table.
  - If no matching rows found in sheet, write: "No backlink data found in Google Sheet for {{CLIENT_NAME}}."

Step 2 — If Google Sheet is unavailable or empty, check uploaded files.
  - Look for any uploaded file that appears to be a backlink sheet (columns like Target URL, Backlink URL, Source Domain, Anchor Text).
  - Apply the same client filter: Target URL contains {{CLIENT_URL}} OR Project contains {{CLIENT_NAME}}.
  - Show only last 7 days of data based on Date Created column.

Step 3 — Build the backlink table using ONLY matched rows:

  S.No. | Date Created | Employee | Project | Target URL | Backlink URL | Source Domain | Anchor Text

  - If zero rows match after filtering: write "No backlinks recorded for {{CLIENT_NAME}} in this period."
  - Never include rows from other clients or projects.
  - Never fabricate backlink entries.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEYWORD RANKING INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- If a keyword ranking PDF is uploaded, extract and display ALL keywords in a table exactly as they appear.
- If GSC keyword data is provided, use that as the primary source.
- Table format:

  Keyword | Current Position | Previous Position | Change | Clicks | Impressions | CTR

- Sort by Current Position ascending (rank 1 first).
- If previous position is unavailable, leave that column blank — do not write 0 or N/A.
- Never add keywords not present in the source data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTIONS TO INCLUDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{SECTIONS}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REPORT FORMAT — FOLLOW EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use this structure for every section:

──────────────────────────────
[SECTION TITLE IN CAPS]
Report Period: {{DATE_FROM}} to {{DATE_TO}}
──────────────────────────────

[Data table with exact numbers from source. Label source in brackets e.g. (GSC) (GA4) (Manual)]

Key Metrics Summary:
  - Metric 1: [value] [+/- % change vs previous period] — or "no comparison data"
  - Metric 2: [value] [+/- % change vs previous period]
  - Metric 3: [value] [+/- % change vs previous period]

Key Insights:
  - [Insight drawn directly from the numbers above — no speculation]
  - [Insight drawn directly from the numbers above — no speculation]
  - [Insight drawn directly from the numbers above — no speculation]

Priority Action:
  [One specific, data-backed action. If data is insufficient, write: "Insufficient data to recommend action."]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLOSE WITH: 30-DAY KPI TARGETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build this table using ONLY metrics that have actual current values in the data above.
Do not add KPI rows for metrics with no data.

  KPI | Current Value | 30-Day Target | Basis for Target

  - Targets must be realistic (5–20% improvement) based on current trend visible in the data.
  - If there is no trend data (no comparison period), set target as "To be baselined."
  - Add a one-line note below the table: "Targets based on [X] days of data from [source]."`

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => set(s => {
        const next = s.theme === 'dark' ? 'light' : 'dark'
        if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', next)
        return { theme: next }
      }),
      activeTab: 'generate', setActiveTab: (t) => set({ activeTab: t }),
      config: defaultConfig,
      setConfig: (c) => set((s) => ({ config: { ...s.config, ...c } })),
      setSections: (sections) => set((s) => ({ config: { ...s.config, sections: { ...s.config.sections, ...sections } } })),
      googleToken: null, setGoogleToken: (t) => set({ googleToken: t }),
      googleEmail: '', setGoogleEmail: (e) => set({ googleEmail: e }),
      gscProperties: [], setGscProperties: (p) => set({ gscProperties: p }),
      ga4Properties: [], setGa4Properties: (p) => set({ ga4Properties: p }),
      gscData: null, setGscData: (d) => set({ gscData: d }),
      ga4Data: null, setGa4Data: (d) => set({ ga4Data: d }),
      kwData: [], setKwData: (d) => set({ kwData: d }),
      sheetData: null, setSheetData: (d) => set({ sheetData: d }),
      uploadedFiles: [], addUploadedFile: (f) => set((s) => ({ uploadedFiles: [...s.uploadedFiles, f] })),
      removeUploadedFile: (id) => set((s) => ({ uploadedFiles: s.uploadedFiles.filter(f => f.id !== id) })),
      clearUploadedFiles: () => set({ uploadedFiles: [] }),
      manualGsc: '', manualGa4: '', manualKeywords: '', manualNotes: '',
      setManualData: (key, val) => set({ [key]: val }),
      generatedReport: '', setGeneratedReport: (r) => set({ generatedReport: r }),
      isGenerating: false, setIsGenerating: (v) => set({ isGenerating: v }),
      isFetching: { gsc: false, ga4: false, kw: false, sheets: false },
      setIsFetching: (key, v) => set((s) => ({ isFetching: { ...s.isFetching, [key]: v } })),
      progress: 0, progressLabel: '', setProgress: (p, l) => set({ progress: p, progressLabel: l }),
      logs: [],
      addLog: (msg, type = 'default') => {
        const ts = new Date().toLocaleTimeString('en-IN', { hour12: false })
        set((s) => ({ logs: [...s.logs.slice(-199), { ts, msg, type }] }))
      },
      clearLogs: () => set({ logs: [] }),
      masterPrompt: DEFAULT_PROMPT, setMasterPrompt: (p) => set({ masterPrompt: p }),
      history: [],
      addHistory: (e) => set((s) => ({ history: [e, ...s.history].slice(0, 30) })),
      loadHistory: (id) => {
        const entry = get().history.find(h => h.id === id)
        if (entry) set({ generatedReport: entry.report, activeTab: 'generate', config: { ...get().config, clientName: entry.client } })
      },
      schedules: [],
      addSchedule: (s) => set((st) => ({ schedules: [...st.schedules, { ...s, id: Date.now(), createdAt: new Date().toISOString() }] })),
      removeSchedule: (id) => set((s) => ({ schedules: s.schedules.filter(x => x.id !== id) })),
      settings: { model: 'claude-sonnet-4-6', maxTokens: 6000 },
      setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      _hasHydrated: false, setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'seo-report-store-v6',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage
        return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      }),
    partialize: (s) => ({
        theme: s.theme, config: s.config, history: s.history, schedules: s.schedules,
        settings: s.settings, masterPrompt: s.masterPrompt,
        manualGsc: s.manualGsc, manualGa4: s.manualGa4,
        manualKeywords: s.manualKeywords, manualNotes: s.manualNotes,
        googleToken: s.googleToken,
        googleEmail: s.googleEmail,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true)
          if (typeof document !== 'undefined')
            document.documentElement.setAttribute('data-theme', state.theme || 'dark')
        }
      },
      skipHydration: true,
    }
  )
)
