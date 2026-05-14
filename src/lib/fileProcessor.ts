import type { UploadedFile } from '@/types'

const ANTHROPIC_KEY_GETTER = (): string =>
  typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('seo-report-store-v2') || '{}')?.state?.settings?.anthropicKey || '') : ''

// ── READ FILE AS BASE64 ───────────────────────────────────────────────────────
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res((r.result as string).split(',')[1])
    r.onerror = () => rej(new Error('Failed to read file'))
    r.readAsDataURL(file)
  })
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(new Error('Failed to read file'))
    r.readAsText(file)
  })
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as ArrayBuffer)
    r.onerror = () => rej(new Error('Failed to read file'))
    r.readAsArrayBuffer(file)
  })
}

// ── PROCESS UPLOADED FILE ─────────────────────────────────────────────────────
export async function processFile(file: File): Promise<UploadedFile> {
  const id = crypto.randomUUID()
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  let content = ''
  let extractedText = ''
  let mimeType = file.type

  try {
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      // Image → base64 for Claude vision
      content = await readFileAsBase64(file)
      mimeType = file.type || `image/${ext}`
      extractedText = `[Image file: ${file.name}]`

    } else if (ext === 'pdf') {
      // PDF → base64 for Claude document API
      content = await readFileAsBase64(file)
      mimeType = 'application/pdf'
      extractedText = `[PDF file: ${file.name} — Claude will read this directly]`

    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      // Excel/CSV → extract to text
      if (ext === 'csv') {
        extractedText = await readFileAsText(file)
        content = btoa(unescape(encodeURIComponent(extractedText)))
      } else {
        const buf = await readFileAsArrayBuffer(file)
        const XLSX = await import('xlsx')
        const wb = XLSX.read(buf, { type: 'array' })
        const lines: string[] = []
        wb.SheetNames.slice(0, 3).forEach(name => {
          const ws = wb.Sheets[name]
          lines.push(`=== Sheet: ${name} ===`)
          lines.push(XLSX.utils.sheet_to_csv(ws))
        })
        extractedText = lines.join('\n\n')
        content = btoa(unescape(encodeURIComponent(extractedText)))
      }
      mimeType = 'text/plain'

    } else if (['docx', 'doc'].includes(ext)) {
      // Word doc → extract text via mammoth
      const buf = await readFileAsArrayBuffer(file)
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ arrayBuffer: buf })
      extractedText = result.value
      content = btoa(unescape(encodeURIComponent(extractedText)))
      mimeType = 'text/plain'

    } else if (['txt', 'md', 'json'].includes(ext)) {
      extractedText = await readFileAsText(file)
      content = btoa(unescape(encodeURIComponent(extractedText)))
      mimeType = 'text/plain'

    } else {
      extractedText = await readFileAsText(file).catch(() => `[Binary file: ${file.name}]`)
      content = btoa(unescape(encodeURIComponent(extractedText)))
      mimeType = 'text/plain'
    }
  } catch (e) {
    extractedText = `[Error processing ${file.name}: ${e instanceof Error ? e.message : 'Unknown error'}]`
    content = ''
  }

  return {
    id, name: file.name, type: ext, size: file.size,
    content, extractedText, mimeType,
    uploadedAt: new Date().toISOString(),
  }
}

// ── BUILD CLAUDE MESSAGE WITH FILES ───────────────────────────────────────────
export function buildClaudeMessages(
  prompt: string,
  files: UploadedFile[]
): Array<{ role: string; content: unknown }> {
  if (!files.length) {
    return [{ role: 'user', content: prompt }]
  }

  // Build multipart content with files + prompt
  const contentParts: unknown[] = []

  files.forEach(f => {
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(f.type) && f.content) {
      // Image → vision block
      contentParts.push({
        type: 'image',
        source: { type: 'base64', media_type: f.mimeType, data: f.content },
      })
      contentParts.push({
        type: 'text',
        text: `[Above image: ${f.name}]`,
      })
    } else if (f.type === 'pdf' && f.content) {
      // PDF → document block
      contentParts.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: f.content },
      })
      contentParts.push({
        type: 'text',
        text: `[Above document: ${f.name}]`,
      })
    } else if (f.extractedText) {
      // Text/Excel/Word → inline text
      contentParts.push({
        type: 'text',
        text: `=== Uploaded File: ${f.name} ===\n${f.extractedText.slice(0, 8000)}\n=== End of ${f.name} ===`,
      })
    }
  })

  // Add main prompt at the end
  contentParts.push({ type: 'text', text: prompt })

  return [{ role: 'user', content: contentParts }]
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
