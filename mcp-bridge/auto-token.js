/**
 * SEO Report Tool -- Ubersuggest Token Auto-Fetcher
 * ==================================================
 * Paste this script into the Chrome DevTools Console while on claude.ai
 * (or use it as a bookmarklet).
 *
 * What it does:
 *   1. Intercepts all fetch() calls made by claude.ai
 *   2. Watches for requests to ubersuggest-mcp.neilpatelapi.com
 *   3. Extracts the Authorization header (Bearer token)
 *   4. Automatically POSTs it to your local bridge on localhost:3001
 *   5. Shows a confirmation banner on claude.ai
 *
 * Usage:
 *   A) Console: Open claude.ai -> F12 -> Console -> paste this whole script -> Enter
 *   B) Bookmarklet: Create a bookmark, set URL to the bookmarklet version in HOW_TO_GET_TOKEN.md
 *
 * Then: Start a Claude.ai conversation that uses Ubersuggest (just say
 *   "use your Ubersuggest tool to check keywords for google.com").
 *   The token will be captured and pushed to your bridge automatically.
 */

(function() {
  const BRIDGE = 'http://localhost:3001'
  const TARGET = 'ubersuggest-mcp.neilpatelapi.com'

  // Avoid double-installing
  if (window.__seoToolTokenWatcher) {
    console.log('[SEO Tool] Token watcher already running.')
    showBanner('Token watcher already active. Just trigger Ubersuggest in Claude.', 'info')
    return
  }
  window.__seoToolTokenWatcher = true

  // Patch fetch to intercept requests
  const originalFetch = window.fetch
  window.fetch = async function(...args) {
    const [input, init] = args
    const url = typeof input === 'string' ? input : input?.url || ''

    if (url.includes(TARGET)) {
      const authHeader =
        init?.headers?.Authorization ||
        init?.headers?.authorization ||
        (init?.headers instanceof Headers ? init.headers.get('authorization') : null)

      if (authHeader) {
        console.log('[SEO Tool] Ubersuggest token intercepted!')
        pushToken(authHeader)
      }
    }

    return originalFetch.apply(this, args)
  }

  async function pushToken(token) {
    try {
      const res = await originalFetch(`${BRIDGE}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        console.log('[SEO Tool] Token pushed to bridge successfully!')
        showBanner('Ubersuggest token captured & sent to bridge! You can now use the SEO Tool.', 'success')
        // Stop watching after success
        window.fetch = originalFetch
        window.__seoToolTokenWatcher = false
      } else {
        const err = await res.text()
        console.error('[SEO Tool] Bridge error:', err)
        showBanner('Bridge error: ' + err + ' -- Is the MCP bridge running?', 'error')
      }
    } catch (e) {
      console.error('[SEO Tool] Could not reach bridge:', e.message)
      showBanner('Could not reach bridge on port 3001. Start it with: node server.js', 'error')
    }
  }

  function showBanner(msg, type) {
    const existing = document.getElementById('seo-tool-banner')
    if (existing) existing.remove()

    const colors = {
      success: { bg: '#052e16', border: '#16a34a', text: '#4ade80' },
      error:   { bg: '#2d0a0a', border: '#dc2626', text: '#f87171' },
      info:    { bg: '#0f1a2e', border: '#3b82f6', text: '#93c5fd' },
    }
    const c = colors[type] || colors.info

    const banner = document.createElement('div')
    banner.id = 'seo-tool-banner'
    banner.style.cssText = `
      position: fixed; top: 16px; right: 16px; z-index: 99999;
      background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
      padding: 12px 16px; border-radius: 10px; font-size: 13px;
      font-family: system-ui, sans-serif; max-width: 380px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4); line-height: 1.4;
    `
    banner.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} SEO Report Tool
      </div>
      <div>${msg}</div>
      <div style="margin-top:8px;font-size:11px;opacity:0.7;">Click to dismiss</div>
    `
    banner.onclick = () => banner.remove()
    document.body.appendChild(banner)
    if (type === 'success') setTimeout(() => banner?.remove(), 8000)
  }

  // Show initial confirmation
  showBanner(
    'Token watcher active! Now trigger Ubersuggest in Claude (e.g. "check keywords for google.com using Ubersuggest"). Token will be captured automatically.',
    'info'
  )
  console.log(`[SEO Tool] Token watcher installed. Watching for requests to ${TARGET}`)
})()
