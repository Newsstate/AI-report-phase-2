import type { GSCSummary, GA4Summary, KeywordRow, GoogleSheetData } from '@/types'

const GSC_BASE    = 'https://www.googleapis.com/webmasters/v3/sites'
const GA4_BASE    = 'https://analyticsdata.googleapis.com/v1beta/properties'
const GA4_ADMIN   = 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries'
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

// ─── OAUTH ────────────────────────────────────────────────────────────────────
export function buildOAuthUrl(clientId: string, redirectUri: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics.edit',       // needed to list GA4 properties
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'email', 'profile',
  ].join(' ')
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri,
    response_type: 'token', scope: scopes,
    include_granted_scopes: 'true', prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function getUserInfo(token: string): Promise<{ email: string; name: string }> {
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error('Failed to get user info')
  return r.json()
}

// ─── SEARCH CONSOLE ──────────────────────────────────────────────────────────
export async function listGSCProperties(token: string): Promise<string[]> {
  const r = await fetch(GSC_BASE, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error(`GSC list error: ${r.statusText}`)
  const d = await r.json()
  return (d.siteEntry || []).map((s: { siteUrl: string }) => s.siteUrl)
}

async function queryGSC(token: string, property: string, startDate: string, endDate: string, dimensions: string[], rowLimit = 1) {
  const url = `${GSC_BASE}/${encodeURIComponent(property)}/searchAnalytics/query`
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate, endDate, dimensions, rowLimit,
      orderBy: dimensions.length ? [{ fieldName: 'impressions', sortOrder: 'DESCENDING' }] : undefined,
    }),
  })
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || r.statusText) }
  return r.json()
}

// GSC metric keys the API returns
export const GSC_METRICS = [
  { key: 'clicks',      label: 'Clicks',        default: true },
  { key: 'impressions', label: 'Impressions',    default: true },
  { key: 'ctr',         label: 'CTR',            default: true },
  { key: 'position',    label: 'Avg. Position',  default: true },
] as const
export type GscMetricKey = typeof GSC_METRICS[number]['key']

export async function fetchGSCSummary(
  token: string, property: string,
  dateFrom: string, dateTo: string, prevFrom: string, prevTo: string,
  metrics: GscMetricKey[] = ['clicks','impressions','ctr','position']
): Promise<GSCSummary> {
  const hasPrev = !!(prevFrom && prevTo)
  const [curr, prev] = await Promise.all([
    queryGSC(token, property, dateFrom, dateTo, []),
    hasPrev ? queryGSC(token, property, prevFrom, prevTo, []) : Promise.resolve(null),
  ])
  const c = curr.rows?.[0] || {}
  const p = prev?.rows?.[0] || {}
  const pick = (row: Record<string, number>) =>
    Object.fromEntries(metrics.map(m => [m, row[m] ?? 0])) as Record<GscMetricKey, number>
  const base = pick(c); const basePrev = pick(p)
  return {
    clicks:      base.clicks      ?? 0,
    impressions: base.impressions ?? 0,
    ctr:         base.ctr         ?? 0,
    position:    base.position    ?? 0,
    selectedMetrics: metrics,
    prev: hasPrev ? {
      clicks:      basePrev.clicks      ?? 0,
      impressions: basePrev.impressions ?? 0,
      ctr:         basePrev.ctr         ?? 0,
      position:    basePrev.position    ?? 0,
    } : undefined,
  }
}

export async function fetchGSCKeywords(
  token: string, property: string,
  dateFrom: string, dateTo: string, prevFrom: string, prevTo: string,
): Promise<KeywordRow[]> {
  const hasPrev = !!(prevFrom && prevTo)
  const [curr, prev] = await Promise.all([
    queryGSC(token, property, dateFrom, dateTo, ['query'], 30),
    hasPrev ? queryGSC(token, property, prevFrom, prevTo, ['query'], 30) : Promise.resolve(null),
  ])
  const prevMap: Record<string, number> = {}
  ;((prev?.rows) || []).forEach((r: { keys: string[]; position: number }) => {
    prevMap[r.keys[0]] = r.position
  })
  return (curr.rows || []).map((r: { keys: string[]; position: number; clicks: number; impressions: number; ctr: number }) => ({
    keyword: r.keys[0], position: r.position, prevPos: prevMap[r.keys[0]] ?? null,
    clicks: r.clicks, impressions: r.impressions, ctr: r.ctr,
  }))
}

// ─── GA4 PROPERTIES LIST ─────────────────────────────────────────────────────
export interface GA4Property {
  propertyId: string   // numeric, e.g. "362126245"
  displayName: string  // e.g. "Whitebunnie AI Website"
  websiteUrl:  string  // e.g. "https://whitebunnie.com"
}

export async function listGA4Properties(token: string): Promise<GA4Property[]> {
  const r = await fetch(GA4_ADMIN, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) {
    // Fallback: try listing via analytics.googleapis.com accounts
    const r2 = await fetch('https://www.googleapis.com/analytics/v3/management/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r2.ok) throw new Error(`GA4 property list error: ${r.statusText}`)
    // BUG FIX: was reading r.json() here — must read r2 instead
    const d2 = await r2.json()
    const props: GA4Property[] = []
    for (const account of d2.accountSummaries || []) {
      for (const prop of account.propertySummaries || []) {
        const id = prop.property?.replace('properties/', '') || ''
        props.push({ propertyId: id, displayName: prop.displayName || id, websiteUrl: '' })
      }
    }
    return props
  }
  const d = await r.json()
  const props: GA4Property[] = []
  for (const account of d.accountSummaries || []) {
    for (const prop of account.propertySummaries || []) {
      const id = prop.property?.replace('properties/', '') || ''
      props.push({
        propertyId: id,
        displayName: prop.displayName || id,
        websiteUrl: '',
      })
    }
  }
  return props
}

// ─── GA4 METRICS CATALOGUE ───────────────────────────────────────────────────
export const GA4_METRICS = [
  { key: 'sessions',          label: 'Sessions',              default: true },
  { key: 'totalUsers',        label: 'Total Users',           default: true },
  { key: 'newUsers',          label: 'New Users',             default: true },
  { key: 'engagementRate',    label: 'Engagement Rate',       default: true },
  { key: 'bounceRate',        label: 'Bounce Rate',           default: true },
  { key: 'averageSessionDuration', label: 'Avg Session Duration', default: true },
  { key: 'screenPageViews',   label: 'Page Views',            default: true },
  { key: 'conversions',       label: 'Conversions',           default: false },
  { key: 'eventCount',        label: 'Event Count',           default: false },
  { key: 'userEngagementDuration', label: 'Engagement Duration (s)', default: false },
  { key: 'activeUsers',       label: 'Active Users',          default: false },
  { key: 'dauPerMau',         label: 'DAU / MAU',             default: false },
] as const
export type Ga4MetricKey = typeof GA4_METRICS[number]['key']

// ─── GA4 FETCH (dynamic metrics) ─────────────────────────────────────────────
export async function fetchGA4Summary(
  token: string, propertyId: string,
  dateFrom: string, dateTo: string, prevFrom: string, prevTo: string,
  selectedMetrics: Ga4MetricKey[] = ['sessions','totalUsers','newUsers','engagementRate','bounceRate','averageSessionDuration','screenPageViews']
): Promise<GA4Summary> {
  const url = `${GA4_BASE}/${propertyId}:runReport`
const hasPrev = !!(prevFrom && prevTo)
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: hasPrev
        ? [{ startDate: dateFrom, endDate: dateTo }, { startDate: prevFrom, endDate: prevTo }]
        : [{ startDate: dateFrom, endDate: dateTo }],
      metrics: selectedMetrics.map(name => ({ name })),
    }),
  })
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || r.statusText) }
  const d = await r.json()

  const rows: Array<{ dimensionValues?: Array<{value:string}>; metricValues: Array<{value:string}> }> = d.rows || []

  function parseRow(row: typeof rows[0]) {
    const result: Record<string, number> = {}
    selectedMetrics.forEach((key, i) => {
      result[key] = parseFloat(row.metricValues[i]?.value || '0') || 0
    })
    return result
  }

  const currRow = rows.find(r => r.dimensionValues?.[0]?.value === 'date_range_0') ?? rows[0]
  const prevRow = rows.find(r => r.dimensionValues?.[0]?.value === 'date_range_1') ?? rows[1]

  return {
    current: currRow ? {
      sessions:         parseRow(currRow)['sessions']         ?? 0,
      users:            parseRow(currRow)['totalUsers']        ?? parseRow(currRow)['activeUsers'] ?? 0,
      newUsers:         parseRow(currRow)['newUsers']          ?? 0,
      engagementRate:   parseRow(currRow)['engagementRate']    ?? 0,
      bounceRate:       parseRow(currRow)['bounceRate']        ?? 0,
      avgSessionDuration: parseRow(currRow)['averageSessionDuration'] ?? 0,
      pageViews:        parseRow(currRow)['screenPageViews']   ?? 0,
      conversions:      parseRow(currRow)['conversions']       ?? 0,
      raw:              parseRow(currRow),
      selectedMetrics,
    } : { sessions:0, users:0, newUsers:0, engagementRate:0, bounceRate:0, avgSessionDuration:0, pageViews:0, conversions:0, raw:{}, selectedMetrics },
    previous: prevRow ? {
      sessions:         parseRow(prevRow)['sessions']         ?? 0,
      users:            parseRow(prevRow)['totalUsers']        ?? parseRow(prevRow)['activeUsers'] ?? 0,
      newUsers:         parseRow(prevRow)['newUsers']          ?? 0,
      engagementRate:   parseRow(prevRow)['engagementRate']    ?? 0,
      bounceRate:       parseRow(prevRow)['bounceRate']        ?? 0,
      avgSessionDuration: parseRow(prevRow)['averageSessionDuration'] ?? 0,
      pageViews:        parseRow(prevRow)['screenPageViews']   ?? 0,
      conversions:      parseRow(prevRow)['conversions']       ?? 0,
      raw:              parseRow(prevRow),
      selectedMetrics,
    } : undefined,
  }
}

// ─── GOOGLE SHEETS ───────────────────────────────────────────────────────────
export async function fetchGoogleSheet(token: string, sheetId: string): Promise<GoogleSheetData> {
  const metaR = await fetch(`${SHEETS_BASE}/${sheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!metaR.ok) {
    const e = await metaR.json().catch(() => ({}))
    throw new Error(e.error?.message || `Sheet access error: ${metaR.statusText}`)
  }
  const meta = await metaR.json()
  const firstSheet = meta.sheets?.[0]?.properties?.title || 'Sheet1'
  const dataR = await fetch(`${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(firstSheet)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!dataR.ok) { const e = await dataR.json().catch(() => ({})); throw new Error(e.error?.message || dataR.statusText) }
  const data = await dataR.json()
  const allRows: string[][] = (data.values || []).map((row: unknown[]) => row.map(c => String(c ?? '')))
  const headers = allRows[0] || []
  const rows = allRows.slice(1)
  return { sheetId, sheetName: firstSheet, headers, rows }
}

export function sheetToText(sheet: GoogleSheetData): string {
  const lines = [sheet.headers.join(' | ')]
  sheet.rows.slice(0, 50).forEach(row => lines.push(row.join(' | ')))
  return `Google Sheet: ${sheet.sheetName}\n${lines.join('\n')}`
}
