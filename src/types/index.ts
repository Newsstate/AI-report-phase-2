export type NavTab = 'generate' | 'connect' | 'upload' | 'schedule' | 'prompt' | 'history' | 'settings'
export type OutputFormat = 'docx' | 'pdf' | 'html' | 'markdown'

export interface GSCSummary {
  clicks: number; impressions: number; ctr: number; position: number
  selectedMetrics?: string[]
  prev: { clicks: number; impressions: number; ctr: number; position: number }
}

export interface GA4Summary {
  current: {
    sessions: number; users: number; newUsers: number
    engagementRate: number; bounceRate: number
    avgSessionDuration: number; pageViews: number; conversions: number
    raw: Record<string, number>
    selectedMetrics: string[]
  }
  previous?: {
    sessions: number; users: number; newUsers: number
    engagementRate: number; bounceRate: number
    avgSessionDuration: number; pageViews: number; conversions: number
    raw: Record<string, number>
    selectedMetrics: string[]
  }
}

export interface KeywordRow {
  keyword: string; position: number; prevPos: number | null
  clicks: number; impressions: number; ctr: number
}

export interface GoogleSheetData {
  sheetId: string; sheetName: string
  headers: string[]; rows: string[][]
}

export interface UploadedFile {
  id: string; name: string; type: string; size: number
  content: string; extractedText: string; mimeType: string; uploadedAt: string
}

export interface ReportConfig {
  clientName: string; clientUrl: string
  gscProperty: string; ga4PropertyId: string
  sheetId: string; ubersuggestDomain: string
  dateFrom: string; dateTo: string; prevFrom: string; prevTo: string
  // Selected metrics
  ga4Metrics: string[]
  gscMetrics: string[]
  sections: {
    exec: boolean; ga4: boolean; gsc: boolean; keywords: boolean
    sheets: boolean; ubersuggest: boolean; uploads: boolean; authority: boolean; plan: boolean
  }
  outputFormat: OutputFormat; tone: string
}

export interface ScheduleEntry {
  id: number; client: string; url: string; ga4: string
  freq: 'weekly' | 'biweekly' | 'monthly'; day: string; createdAt: string
}

export interface HistoryEntry {
  id: number; client: string; dateFrom: string; dateTo: string
  format: OutputFormat; hadLiveData: boolean; report: string; savedAt: string
}

export interface LogEntry {
  ts: string; msg: string
  type: 'default' | 'ok' | 'err' | 'warn' | 'info' | 'dim'
}

export interface AppSettings {
  model: string; maxTokens: number
}
