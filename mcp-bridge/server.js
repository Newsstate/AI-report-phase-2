/**
 * SEO Report Tool -- Local MCP Bridge Server v2.0
 * Runs on http://localhost:3001
 *
 * NEW: Token auto-fetch via bookmarklet
 *   POST   /token         { token }  -- bookmarklet pushes token here
 *   GET    /token/status             -- UI polls: { hasToken, expiresIn }
 *   DELETE /token                    -- clear cached token
 *
 * FALLBACK: manual token via x-mcp-token header (Settings tab)
 */

import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors({ origin: (o, cb) => cb(null, true), methods: ['GET','POST','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','x-mcp-token'] }))
app.use(express.json())

const MCP_URL = 'https://ubersuggest-mcp.neilpatelapi.com/mcp'
const TOKEN_TTL_MS = 46 * 60 * 60 * 1000  // 46 hours

let cachedToken = null  // { value: string, pushedAt: number }

function getEffectiveToken(req) {
  // Priority 1: per-request header (manual, from Settings)
  const h = req.headers['x-mcp-token']
  if (h) return h
  // Priority 2: bookmarklet-pushed cached token
  if (cachedToken) {
    if (Date.now() - cachedToken.pushedAt < TOKEN_TTL_MS) return cachedToken.value
    cachedToken = null  // expired
  }
  return null
}

// ── TOKEN ENDPOINTS ───────────────────────────────────────────────────────────

app.post('/token', (req, res) => {
  let { token } = req.body
  if (!token) return res.status(400).json({ error: 'Body must include { token }' })
  token = token.trim()
  if (!token.startsWith('Bearer ')) token = 'Bearer ' + token
  cachedToken = { value: token, pushedAt: Date.now() }
  console.log('[Bridge] Token auto-pushed from bookmarklet')
  res.json({ ok: true, pushedAt: cachedToken.pushedAt })
})

app.get('/token/status', (req, res) => {
  if (!cachedToken) return res.json({ hasToken: false })
  const age = Date.now() - cachedToken.pushedAt
  if (age >= TOKEN_TTL_MS) { cachedToken = null; return res.json({ hasToken: false, reason: 'expired' }) }
  res.json({ hasToken: true, expiresIn: Math.round((TOKEN_TTL_MS - age) / 60000), pushedAt: cachedToken.pushedAt })
})

app.delete('/token', (req, res) => {
  cachedToken = null
  res.json({ ok: true })
})

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const ts = cachedToken
    ? { hasToken: true, expiresIn: Math.round((TOKEN_TTL_MS - (Date.now() - cachedToken.pushedAt)) / 60000) + 'm' }
    : { hasToken: false }
  res.json({ status: 'ok', bridge: 'SEO MCP Bridge v2.0', port: 3001, ...ts })
})

// ── DATA ENDPOINTS ────────────────────────────────────────────────────────────

app.get('/tools', async (req, res) => {
  const token = getEffectiveToken(req)
  if (!token) return res.status(401).json({ error: 'No token -- run the bookmarklet on claude.ai first' })
  try { res.json(await mcpRequest(token, 'tools/list', {})) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/keywords/domain', async (req, res) => {
  const token = getEffectiveToken(req)
  if (!token) return res.status(401).json({ error: 'No token -- run the bookmarklet on claude.ai first' })
  const { domain, locId = 2356, language = 'en', limit = 30 } = req.body
  if (!domain) return res.status(400).json({ error: 'domain is required' })
  try {
    console.log(`[MCP] Domain keywords: ${domain}`)
    const result = await mcpRequest(token, 'tools/call', {
      name: 'domain_keywords',
      arguments: { domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''), loc_id: locId, language, limit }
    })
    const keywords = parseKeywordsFromMCP(result)
    res.json({ domain, keywords, count: keywords.length })
  } catch (e) {
    res.status(500).json({ error: e.message, hint: 'Re-run the bookmarklet if token expired' })
  }
})

app.post('/domain/overview', async (req, res) => {
  const token = getEffectiveToken(req)
  if (!token) return res.status(401).json({ error: 'No token' })
  const { domain, locId = 2356 } = req.body
  if (!domain) return res.status(400).json({ error: 'domain is required' })
  try {
    const result = await mcpRequest(token, 'tools/call', {
      name: 'domain_overview',
      arguments: { domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''), loc_id: locId }
    })
    res.json({ domain, overview: result })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/keywords/suggest', async (req, res) => {
  const token = getEffectiveToken(req)
  if (!token) return res.status(401).json({ error: 'No token' })
  const { keyword, locId = 2356, language = 'en' } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword is required' })
  try {
    const result = await mcpRequest(token, 'tools/call', { name: 'keyword_suggestions', arguments: { keyword, loc_id: locId, language } })
    res.json({ keyword, suggestions: result })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/project/rankings', async (req, res) => {
  const token = getEffectiveToken(req)
  if (!token) return res.status(401).json({ error: 'No token' })
  const { projectId, startDate, endDate } = req.body
  try {
    const result = await mcpRequest(token, 'tools/call', {
      name: 'project_position_info',
      arguments: { project_id: projectId, startDate: startDate || getDateDaysAgo(7), endDate: endDate || getDateDaysAgo(0), locId: 2356, language: 'en' }
    })
    res.json({ projectId, rankings: result })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/projects', async (req, res) => {
  const token = getEffectiveToken(req)
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const result = await mcpRequest(token, 'tools/call', { name: 'list_projects', arguments: {} })
    res.json({ projects: result })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── MCP REQUEST HELPER ────────────────────────────────────────────────────────
async function mcpRequest(token, method, params) {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MCP ${response.status}: ${text.slice(0, 200)}`)
  }
  const ct = response.headers.get('content-type') || ''
  if (ct.includes('event-stream')) return parseSSEResponse(await response.text())
  const data = await response.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data.result
}

function parseSSEResponse(text) {
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const d = JSON.parse(line.slice(6))
        if (d.result) return d.result
        if (d.error) throw new Error(d.error.message)
      } catch (e) {
        if (e.message !== 'Unexpected end of JSON input') throw e
      }
    }
  }
  return null
}

function parseKeywordsFromMCP(result) {
  if (!result) return []
  const content = result.content || result
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === 'text' && block.text) {
        try {
          const p = JSON.parse(block.text)
          if (p.keywords) return p.keywords
          if (Array.isArray(p)) return p
        } catch {}
      }
    }
  }
  if (result.keywords) return result.keywords
  if (Array.isArray(result)) return result
  return []
}

function getDateDaysAgo(days) {
  const d = new Date(); d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

const PORT = 3001
app.listen(PORT, () => {
  console.log(`
+--------------------------------------------------+
|      SEO Report Tool -- MCP Bridge v2.0          |
|                                                  |
|   http://localhost:${PORT}                          |
|                                                  |
|   Token:  POST /token  (bookmarklet auto-push)   |
|           GET  /token/status                     |
|   Data:   POST /keywords/domain                  |
|           POST /domain/overview                  |
|           GET  /projects                         |
|           POST /project/rankings                 |
+--------------------------------------------------+
  `)
})
