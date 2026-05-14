import type { ReportConfig, GSCSummary, GA4Summary, KeywordRow, GoogleSheetData, UploadedFile } from '@/types'
import { sheetToText } from './googleApi'

function pct(c: number, p: number, lb = false) {
  if (!p) return 'N/A'
  const d = ((c - p) / Math.abs(p)) * 100
  const ok = lb ? d < 0 : d > 0
  return `${d > 0 ? '+' : ''}${d.toFixed(1)}% ${ok ? '(improved)' : '(declined)'}`
}

export function buildPrompt(
  template: string, config: ReportConfig,
  gscData: GSCSummary | null, ga4Data: GA4Summary | null,
  kwData: KeywordRow[],
  sheetData: GoogleSheetData | null,
  manualGsc: string, manualGa4: string,
  manualKeywords: string, manualNotes: string,
  uploadedFiles: UploadedFile[]
): string {
  const sections: string[] = []
  if (config.sections.exec)     sections.push('1. Executive Summary — wins, concerns, 3 actionable insights')
  if (config.sections.ga4)      sections.push('2. Organic Traffic Report (GA4) — sessions, users, engagement, bounce rate (week-over-week table)')
  if (config.sections.gsc)      sections.push('3. Search Console Performance — clicks, impressions, CTR, avg position (table + analysis)')
  if (config.sections.keywords) sections.push('4. Keyword Rankings Report — from uploaded keyword PDF or GSC data (table format)')
  if (config.sections.authority)sections.push('5. Website Authority — domain authority, backlinks, referring domains (from uploaded data)')
  if (config.sections.plan)     sections.push('6. Key Insights & Recommendations + 30-Day KPI Targets table')

  // GSC block
  let gscBlock = manualGsc || 'Not fetched.'
  if (gscData) {
    gscBlock = `Period: ${config.dateFrom} to ${config.dateTo} vs ${config.prevFrom} to ${config.prevTo}
Clicks: ${gscData.clicks.toLocaleString()} (prev: ${gscData.prev.clicks.toLocaleString()}) ${pct(gscData.clicks, gscData.prev.clicks)}
Impressions: ${gscData.impressions.toLocaleString()} (prev: ${gscData.prev.impressions.toLocaleString()}) ${pct(gscData.impressions, gscData.prev.impressions)}
CTR: ${(gscData.ctr*100).toFixed(2)}% (prev: ${(gscData.prev.ctr*100).toFixed(2)}%) ${pct(gscData.ctr, gscData.prev.ctr)}
Avg Position: ${gscData.position.toFixed(2)} (prev: ${gscData.prev.position.toFixed(2)}) ${pct(gscData.position, gscData.prev.position, true)}`
    if (manualGsc) gscBlock += `\nAdditional notes: ${manualGsc}`
  }

  // GA4 block
  let ga4Block = manualGa4 || 'Not fetched.'
  if (ga4Data?.current) {
    const c = ga4Data.current; const p = ga4Data.previous
    ga4Block = `Sessions: ${Math.round(c.sessions)}${p ? ` (prev: ${Math.round(p.sessions)}) ${pct(c.sessions, p.sessions)}` : ''}
Users: ${Math.round(c.users)}${p ? ` (prev: ${Math.round(p.users)}) ${pct(c.users, p.users)}` : ''}
Engaged Sessions: N/A
Engagement Rate: ${(c.engagementRate*100).toFixed(2)}%${p ? ` (prev: ${(p.engagementRate*100).toFixed(2)}%) ${pct(c.engagementRate, p.engagementRate)}` : ''}
Bounce Rate: N/A
Avg Session Duration: N/A
Conversions: ${Math.round(c.conversions)}${p ? ` (prev: ${Math.round(p.conversions)}) ${pct(c.conversions, p.conversions)}` : ''}`
    if (manualGa4) ga4Block += `\nAdditional: ${manualGa4}`
  }

  // Keyword block (GSC)
  let kwBlock = manualKeywords || 'Not fetched.'
  if (kwData.length) {
    kwBlock = 'Keyword | Position | Prev Position | Change | Clicks | Impressions\n'
    kwBlock += kwData.slice(0, 30).map(k => {
      const chg = k.prevPos !== null ? k.prevPos - k.position : null
      const chgStr = chg !== null ? (chg > 0 ? `+${chg.toFixed(1)} (improved)` : chg < 0 ? `${chg.toFixed(1)} (dropped)` : 'stable') : 'NEW'
      return `${k.keyword} | ${k.position.toFixed(1)} | ${k.prevPos ? k.prevPos.toFixed(1) : '—'} | ${chgStr} | ${k.clicks} | ${k.impressions.toLocaleString()}`
    }).join('\n')
    if (manualKeywords) kwBlock += `\nAdditional: ${manualKeywords}`
  }

  // Sheets block
  const shBlock = sheetData ? sheetToText(sheetData) : 'No Google Sheet connected.'

  // Uploads block
  let uploadsBlock = 'No files uploaded.'
  if (uploadedFiles.length) {
    uploadsBlock = `${uploadedFiles.length} file(s) uploaded:\n`
    uploadsBlock += uploadedFiles.map(f => `- ${f.name} (${f.type.toUpperCase()}, ${(f.size/1024).toFixed(1)} KB)`).join('\n')
    uploadsBlock += '\n\nIMPORTANT: Extract all keyword ranking data, DA scores, backlink counts, and any other SEO metrics from these uploaded files. Include this data in the appropriate report sections (Keyword Rankings, Website Authority, etc.).'
    uploadsBlock += '\nFor uploaded keyword PDFs: extract all keyword rows and populate the Keyword Rankings table.'
    uploadsBlock += '\nFor uploaded DA/backlink screenshots or reports: extract metrics for the Website Authority section.'
  }

  return template
    .replace('{{CLIENT_NAME}}', config.clientName || '[Client]')
    .replace('{{CLIENT_URL}}', config.clientUrl || '[URL]')
    .replace('{{DATE_FROM}}', config.dateFrom)
    .replace('{{DATE_TO}}', config.dateTo)
    .replace('{{PREV_FROM}}', config.prevFrom)
    .replace('{{PREV_TO}}', config.prevTo)
    .replace('{{SECTIONS}}', sections.join('\n'))
    .replace('{{GSC_DATA}}', gscBlock)
    .replace('{{GA4_DATA}}', ga4Block)
    .replace('{{KW_DATA}}', kwBlock)
    .replace('{{UBERSUGGEST_DATA}}', uploadsBlock)
    .replace('{{UPLOADS_DATA}}', uploadsBlock)
    .replace('{{SHEETS_DATA}}', shBlock)
    .replace('{{MANUAL_DATA}}', manualNotes || '(none)')
}

