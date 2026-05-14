'use client'

import { useRef, useState } from 'react'
import { useStore } from '@/store'
import { processFile, formatFileSize } from '@/lib/fileProcessor'
import { Button, Card, CardTitle, SectionHeader } from './ui'

const ACCEPTED = '.pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.gif,.txt,.md'

const EXT_ICON: Record<string, string> = {
  pdf: '▤', docx: '▣', doc: '▣', xlsx: '⊞', xls: '⊞', csv: '⊞',
  png: '▨', jpg: '▨', jpeg: '▨', webp: '▨', gif: '▨', txt: '≡', md: '≡',
}

const EXT_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  pdf:  { bg: 'rgba(220,38,38,0.08)',   text: '#DC2626', border: 'rgba(220,38,38,0.2)' },
  docx: { bg: 'rgba(46,95,163,0.08)',   text: '#2E5FA3', border: 'rgba(46,95,163,0.2)' },
  doc:  { bg: 'rgba(46,95,163,0.08)',   text: '#2E5FA3', border: 'rgba(46,95,163,0.2)' },
  xlsx: { bg: 'rgba(22,163,74,0.08)',   text: '#16A34A', border: 'rgba(22,163,74,0.2)' },
  xls:  { bg: 'rgba(22,163,74,0.08)',   text: '#16A34A', border: 'rgba(22,163,74,0.2)' },
  csv:  { bg: 'rgba(22,163,74,0.08)',   text: '#16A34A', border: 'rgba(22,163,74,0.2)' },
  png:  { bg: 'rgba(217,119,6,0.08)',   text: '#D97706', border: 'rgba(217,119,6,0.2)' },
  jpg:  { bg: 'rgba(217,119,6,0.08)',   text: '#D97706', border: 'rgba(217,119,6,0.2)' },
  jpeg: { bg: 'rgba(217,119,6,0.08)',   text: '#D97706', border: 'rgba(217,119,6,0.2)' },
  webp: { bg: 'rgba(217,119,6,0.08)',   text: '#D97706', border: 'rgba(217,119,6,0.2)' },
}

function extOf(name: string) { return name.split('.').pop()?.toLowerCase() || 'txt' }

export function UploadPanel() {
  const store = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      setProcessing(file.name)
      try {
        const processed = await processFile(file)
        store.addUploadedFile(processed)
        store.addLog(`Uploaded: ${file.name} (${formatFileSize(file.size)})`, 'ok')
      } catch (e: unknown) {
        store.addLog(`Failed: ${file.name} — ${e instanceof Error ? e.message : 'Error'}`, 'err')
      }
    }
    setProcessing(null)
  }

  return (
    <div>
      <SectionHeader
        title="Upload Files"
        subtitle="Upload Ubersuggest keyword PDFs, DA screenshots, backlink reports, or any SEO data. Claude reads them automatically."
      />

      {/* DRAG DROP ZONE */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all mb-4"
        style={{
          borderColor: dragging ? 'var(--accent-blue)' : 'var(--border)',
          background: dragging ? 'var(--accent-light)' : 'var(--bg-card)',
        }}>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="hidden"
          onChange={e => handleFiles(e.target.files)} />
        <div className="text-3xl mb-3" style={{ color: 'var(--accent-blue)' }}>↑</div>
        <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
          {processing ? `Processing ${processing}...` : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          PDF, DOCX, XLSX, CSV, PNG, JPG, TXT — up to 10 MB each
        </p>
      </div>

      {/* WHAT TO UPLOAD GUIDE */}
      <Card>
        <CardTitle>What to Upload</CardTitle>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '▤', title: 'Ubersuggest Keyword PDF', desc: 'Export keyword rankings from Ubersuggest as PDF. Claude extracts all rank, volume, and difficulty data.' },
            { icon: '▨', title: 'DA / Backlink Screenshot', desc: 'Screenshot of your Moz, Ahrefs, or Ubersuggest domain authority report. Claude reads the numbers.' },
            { icon: '⊞', title: 'Backlink Tracker Sheet', desc: 'Export a CSV or XLSX of new backlinks. Claude includes them in the Website Authority section.' },
          ].map(item => (
            <div key={item.title} className="rounded-xl p-4 border"
              style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
              <div className="text-2xl mb-2" style={{ color: 'var(--accent-blue)' }}>{item.icon}</div>
              <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{item.title}</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* UPLOADED FILES LIST */}
      {store.uploadedFiles.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{store.uploadedFiles.length} file{store.uploadedFiles.length !== 1 ? 's' : ''} ready for Claude</CardTitle>
            <Button variant="danger" size="sm" onClick={() => { store.clearUploadedFiles(); store.addLog('All files cleared.', 'warn') }}>
              Clear All
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {store.uploadedFiles.map(file => {
              const ext = extOf(file.name)
              const colors = EXT_COLOR[ext] || { bg: 'var(--accent-light)', text: 'var(--accent-blue)', border: 'var(--border)' }
              const icon = EXT_ICON[ext] || '▤'
              return (
                <div key={file.id}
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold border shrink-0"
                    style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
                    {icon}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {ext.toUpperCase()} · {formatFileSize(file.size)} · {file.extractedText?.length > 0 ? `${file.extractedText.length.toLocaleString()} chars extracted` : 'Binary / image'}
                    </div>
                  </div>
                  {/* Type badge */}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0"
                    style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
                    {ext.toUpperCase()}
                  </span>
                  {/* Remove */}
                  <button onClick={() => store.removeUploadedFile(file.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-sm border cursor-pointer transition-colors"
                    style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; e.currentTarget.style.color = '#DC2626' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
          <div className="mt-4 rounded-lg p-3 border text-xs"
            style={{ background: 'var(--accent-light)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent-navy)' }}>Ready:</strong> These files will be sent to Claude when you generate the report. Claude will extract all SEO data (keywords, rankings, DA, backlinks) and populate the relevant sections.
          </div>
        </Card>
      )}

      {store.uploadedFiles.length === 0 && (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          No files uploaded yet. Drop your Ubersuggest keyword PDF above to get started.
        </div>
      )}
    </div>
  )
}
