import { saveAs } from 'file-saver'
import type { OutputFormat } from '@/types'

// ── WB BRAND COLORS (matching SaasWorx_SEO_Weekly_Report exactly) ──────────
const C = {
  navy:    '1F3A6E',  // header bg, h1 color
  blue:    '2E5FA3',  // h2 color, table header
  light:   'F2F6FB',  // alt row bg
  white:   'FFFFFF',
  dark:    '2D2D2D',  // body text
  mid:     '555555',  // secondary text
  green:   '16A34A',
  red:     'DC2626',
  border:  'C8D8EE',
}

export async function exportReport(content: string, clientName: string, format: OutputFormat) {
  const date = new Date().toISOString().split('T')[0]
  const safe = (clientName || 'Client').replace(/[^a-z0-9]/gi, '_')
  const filename = `${safe}_SEO_Report_${date}`

  if (format === 'pdf') {
    exportAsPDF(content, clientName)
  } else if (format === 'docx') {
    await exportAsDocx(content, filename, clientName)
  } else if (format === 'html') {
    saveAs(new Blob([buildHtml(content, clientName)], { type: 'text/html;charset=utf-8' }), `${filename}.html`)
  } else {
    saveAs(new Blob([content], { type: 'text/plain;charset=utf-8' }), `${filename}.md`)
  }
}

// ── PDF ───────────────────────────────────────────────────────────────────────
function exportAsPDF(md: string, clientName: string) {
  const html = buildHtml(md, clientName)
  const w = window.open('', '_blank', 'width=960,height=750')
  if (!w) { alert('Allow popups to download PDF'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); }, 900)
}

// ── DOCX ──────────────────────────────────────────────────────────────────────
async function exportAsDocx(md: string, filename: string, clientName: string) {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
    VerticalAlign, LevelFormat, ImageRun,
  } = await import('docx')

  const bdr = (col = C.border) => ({ style: BorderStyle.SINGLE, size: 4, color: col })
  const bdrs = (col = C.border) => ({ top: bdr(col), bottom: bdr(col), left: bdr(col), right: bdr(col) })
  const noBdr = () => ({ top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } })

  function cell(text: string, w: number, isHdr = false, bg?: string, textColor?: string, align = AlignmentType.CENTER) {
    const tc = textColor || (isHdr ? C.white : C.dark)
    return new TableCell({
      borders: bdrs(isHdr ? C.navy : C.border),
      width: { size: w, type: WidthType.DXA },
      shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        alignment: align,
        children: [new TextRun({ text: text.trim(), bold: isHdr, color: tc, size: isHdr ? 20 : 19, font: 'Arial' })],
        spacing: { before: 0, after: 0 },
      })],
    })
  }

  function hdrBar(text: string) {
    return new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [new TableRow({ children: [
        new TableCell({
          borders: bdrs(C.navy),
          shading: { fill: C.navy, type: ShadingType.CLEAR },
          margins: { top: 160, bottom: 160, left: 280, right: 280 },
          width: { size: 9360, type: WidthType.DXA },
          children: [new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text, bold: true, size: 26, color: C.white, font: 'Arial' })],
            spacing: { before: 0, after: 0 },
          })],
        }),
      ] })]
    })
  }

  const paragraphs: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = []

  // ── COVER PAGE ──
  paragraphs.push(
    new Paragraph({ spacing: { before: 800, after: 160 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'SEO Performance Report', bold: true, size: 52, color: C.navy, font: 'Arial' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
      children: [new TextRun({ text: clientName, bold: true, size: 34, color: C.blue, font: 'Arial' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: `Weekly Report  |  ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, size: 22, color: C.mid, font: 'Arial', italics: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: 'Prepared by: Whitebunnie Digital', size: 20, color: C.mid, font: 'Arial' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 0 },
      children: [new TextRun({ text: 'www.whitebunnie.com', size: 20, color: C.blue, font: 'Arial' })] }),
    new Paragraph({ spacing: { before: 600, after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.blue, space: 1 } }, children: [] }),
    new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true }),
  )

  // ── PARSE MARKDOWN ──
  const lines = md.split('\n')
  let tableRows: string[][] = []
  let inTable = false

  function flushTable() {
    if (!tableRows.length) return
    const cols = tableRows[0].length
    const colW = Math.floor(9360 / cols)
    const widths = Array(cols).fill(colW)
    const rows = tableRows.map((cells, ri) => {
      const isHdr = ri === 0
      const bg = isHdr ? C.navy : ri % 2 === 0 ? C.light : C.white
      return new TableRow({
        tableHeader: isHdr,
        children: cells.map((c, ci) => {
          let tc = isHdr ? C.white : C.dark
          if (!isHdr && (c.startsWith('+') || c.includes('↑'))) tc = C.green
          if (!isHdr && (c.startsWith('-') || c.includes('↓'))) tc = C.red
          return cell(c, widths[ci] || colW, isHdr, bg, tc, ci === 0 ? AlignmentType.LEFT : AlignmentType.CENTER)
        }),
      })
    })
    paragraphs.push(
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows }) as unknown as InstanceType<typeof Paragraph>,
      new Paragraph({ spacing: { before: 120, after: 0 }, children: [] })
    )
    tableRows = []; inTable = false
  }

  lines.forEach(line => {
    if (line.startsWith('|') && !line.match(/^\|[-:\s|]+\|$/)) {
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim())
      tableRows.push(cells); inTable = true
      return
    }
    if (inTable) flushTable()

    if (line.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({ spacing: { before: 0, after: 0 }, children: [] }),
        hdrBar(line.slice(2)) as unknown as InstanceType<typeof Paragraph>,
        new Paragraph({ spacing: { before: 160, after: 60 }, children: [] })
      )
    } else if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({ spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: line.slice(3), bold: true, size: 24, color: C.blue, font: 'Arial' })] }))
    } else if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({ spacing: { before: 160, after: 60 },
        children: [new TextRun({ text: line.slice(4), bold: true, size: 21, color: C.mid, font: 'Arial' })] }))
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      paragraphs.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: line.slice(2), font: 'Arial', size: 20, color: C.dark })],
      }))
    } else if (line === '---') {
      paragraphs.push(new Paragraph({ spacing: { before: 160, after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.border, space: 1 } },
        children: [] }))
    } else if (line.trim()) {
      const bold = line.startsWith('**') && line.endsWith('**')
      const text = bold ? line.slice(2, -2) : line
      paragraphs.push(new Paragraph({ spacing: { before: 40, after: 40 },
        children: [new TextRun({ text, font: 'Arial', size: 20, color: C.dark, bold })] }))
    } else {
      paragraphs.push(new Paragraph({ spacing: { before: 60, after: 0 }, children: [] }))
    }
  })
  if (inTable) flushTable()

  // ── Footer line ──
  paragraphs.push(
    new Paragraph({ spacing: { before: 360, after: 0 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.border, space: 1 } }, children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 0 },
      children: [new TextRun({ text: `${clientName}  |  SEO Weekly Report  |  Whitebunnie Digital  |  www.whitebunnie.com`, size: 16, color: C.mid, font: 'Arial', italics: true })] }),
  )

  const doc = new Document({
    numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }] },
    styles: { default: { document: { run: { font: 'Arial', size: 20, color: C.dark } } } },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children: paragraphs as InstanceType<typeof Paragraph>[] }],
  })

  const buf = await Packer.toBuffer(doc)
  saveAs(new Blob([new Uint8Array(buf)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `${filename}.docx`)
}

// ── HTML (also used for PDF) ───────────────────────────────────────────────
export function buildHtml(md: string, title: string): string {
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(title)} — SEO Report</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',Arial,sans-serif;background:#F4F6F9;color:#2D2D2D;line-height:1.7;padding:0}
@media print{
  body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .no-print{display:none}
  .section-header{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  table thead tr{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  tr:nth-child(even) td{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  h1{page-break-before:always}.cover{page-break-after:always}
  h1:first-of-type{page-break-before:avoid}
}
.page{max-width:900px;margin:0 auto;padding:40px 28px 60px}
.cover{background:linear-gradient(135deg,#1F3A6E 0%,#2E5FA3 100%);color:#fff;padding:60px 48px;border-radius:0;margin:0 -28px 48px;text-align:center}
.cover h1{font-size:32px;font-weight:700;margin-bottom:12px;letter-spacing:-0.5px}
.cover .sub{font-size:18px;opacity:.85;margin-bottom:8px;font-weight:500}
.cover .meta{font-size:13px;opacity:.6;margin-top:8px}
.cover .url{font-size:13px;opacity:.7;margin-top:16px;font-style:italic}
.section-header{background:#1F3A6E;color:#fff;padding:12px 20px;border-radius:6px;margin:36px 0 16px;font-size:16px;font-weight:700;letter-spacing:0.2px}
h2{color:#2E5FA3;font-size:15px;font-weight:700;margin:24px 0 10px;padding-bottom:4px;border-bottom:2px solid #E0E8F4}
h3{color:#555;font-size:13px;font-weight:600;margin:16px 0 8px}
p{margin:8px 0;font-size:13.5px;color:#2D2D2D;line-height:1.75}
ul{padding-left:20px;margin:8px 0}li{margin:5px 0;font-size:13.5px;color:#2D2D2D}
hr{border:none;border-top:2px solid #E0E8F4;margin:32px 0}
table{border-collapse:collapse;width:100%;margin:14px 0 20px;font-size:13px;border-radius:8px;overflow:hidden;box-shadow:0 1px 6px rgba(31,58,110,0.08)}
thead tr{background:#1F3A6E}
th{color:#fff;padding:11px 16px;text-align:left;font-weight:600;font-size:13px}
th:not(:first-child){text-align:center}
td{border:1px solid #E0E8F4;padding:9px 16px;color:#2D2D2D}
td:not(:first-child){text-align:center}
tr:nth-child(even) td{background:#F2F6FB}
.pos{color:#16A34A;font-weight:600}.neg{color:#DC2626;font-weight:600}
.footer{text-align:center;color:#8FA3BF;font-size:12px;margin-top:48px;padding-top:20px;border-top:1px solid #E0E8F4}
.print-btn{position:fixed;bottom:24px;right:24px;background:#1F3A6E;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;box-shadow:0 4px 14px rgba(31,58,110,0.3);letter-spacing:0.2px}
.print-btn:hover{background:#2E5FA3}
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
<div class="page">
<div class="cover">
  <div class="sub">${esc(title)}</div>
  <h1>SEO Performance Report</h1>
  <div class="meta">Weekly Report  |  ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</div>
  <div class="url">Prepared by Whitebunnie Digital  |  www.whitebunnie.com</div>
</div>\n`

  let inList = false, inTable = false, firstH1 = true
  md.split('\n').forEach(line => {
    const notList = !line.startsWith('- ') && !line.startsWith('* ')
    if (notList && inList) { html += '</ul>\n'; inList = false }
    if (line.startsWith('|')) {
      if (line.match(/^\|[-:\s|]+\|$/)) return
      if (!inTable) { html += '<table>'; inTable = true }
      const cells = line.split('|').filter(c => c.trim())
      const isHdr = !inTable || html.endsWith('<table>')
      if (html.endsWith('<table>')) html += '<thead>'
      const tag = isHdr ? 'th' : 'td'
      html += `<tr>${cells.map(c => {
        const t = c.trim()
        const cls = !isHdr && (t.startsWith('+') || t.includes('↑')) ? ' class="pos"' : !isHdr && (t.startsWith('-') || t.includes('↓')) ? ' class="neg"' : ''
        return `<${tag}${cls}>${esc(t)}</${tag}>`
      }).join('')}</tr>\n`
      if (isHdr) html += '</thead><tbody>'
      return
    }
    if (inTable) { html += '</tbody></table>\n'; inTable = false }
    if (line.startsWith('# ')) {
      if (!firstH1) html += `<div class="section-header">${esc(line.slice(2))}</div>\n`
      else { html += `<div class="section-header">${esc(line.slice(2))}</div>\n`; firstH1 = false }
    } else if (line.startsWith('## ')) html += `<h2>${esc(line.slice(3))}</h2>\n`
    else if (line.startsWith('### ')) html += `<h3>${esc(line.slice(4))}</h3>\n`
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) { html += '<ul>\n'; inList = true }
      html += `<li>${esc(line.slice(2))}</li>\n`
    }
    else if (line === '---') html += '<hr/>\n'
    else if (line.trim()) html += `<p>${esc(line)}</p>\n`
    else html += '\n'
  })
  if (inList) html += '</ul>\n'
  if (inTable) html += '</tbody></table>\n'
  html += `<div class="footer">${esc(title)} &nbsp;|&nbsp; SEO Report &nbsp;|&nbsp; Whitebunnie Digital &nbsp;|&nbsp; www.whitebunnie.com</div>
</div></body></html>`
  return html
}
