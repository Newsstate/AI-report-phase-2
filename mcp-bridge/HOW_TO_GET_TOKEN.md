# How to Connect Ubersuggest (Token Auto-Fetch)

The bridge now supports **automatic token capture** — no more manually digging
through DevTools Network headers. A small script intercepts the token from
Claude.ai and pushes it directly to the bridge.

---

## Method 1 — Auto-Fetch Script (Recommended, ~30 seconds)

### What you need
- Chrome browser with claude.ai open
- MCP bridge running (`node server.js` in this folder)
- Ubersuggest connected to your Claude.ai account

### Steps

**1. Start the bridge** (if not already running):
```bash
cd mcp-bridge
node server.js
```

**2. Open Claude.ai in Chrome → F12 → Console tab**

**3. Paste the script from `auto-token.js`** (or copy it from the SEO Tool's
   Connect tab → "Copy Auto-Fetch Script" button) and press Enter.

   You'll see a blue banner: *"Token watcher active!"*

**4. In Claude.ai, send this message:**
```
Use your Ubersuggest tool to check keyword data for google.com
```

**5. Done.** The script intercepts the token the moment Claude.ai calls
   Ubersuggest and pushes it to `localhost:3001/token`. The banner turns green:
   *"Token captured! Go back to the SEO Tool."*

The SEO Tool's Connect tab polls the bridge every 4 seconds and shows a
green "Bridge token active" status when ready.

---

## Method 2 — Manual (original, as backup)

1. Open claude.ai → F12 → Network tab
2. Ask Claude to use Ubersuggest (same prompt as above)
3. Filter network requests by "neilpatel" or "ubersuggest"
4. Click the request → Headers tab → copy `Authorization: Bearer xxxxx`
5. Paste the full value in SEO Tool → Settings → MCP Token

---

## How the Auto-Fetch Works

```
claude.ai (Chrome tab)
  └─ fetch() patched by console script
       └─ detects request to ubersuggest-mcp.neilpatelapi.com
            └─ extracts Authorization header
                 └─ POST http://localhost:3001/token  { token }
                      └─ bridge caches token in memory
                           └─ SEO Tool polls /token/status → green!
```

The bridge stores the token in memory (not on disk). It expires after ~46 hours
(tokens from Claude.ai last ~48 hours). When it expires, just run the script again.

---

## Token Endpoints (for reference)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/token` | POST | Push token `{ token: "Bearer eyJ..." }` |
| `/token/status` | GET | `{ hasToken, expiresIn }` |
| `/token` | DELETE | Clear cached token |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Banner says "Cannot reach bridge on :3001" | Run `node server.js` in mcp-bridge/ |
| Status stays orange after script runs | Make sure Claude actually uses Ubersuggest (it must make a real call) |
| 403 error when fetching keywords | Token expired — re-run the script |
| Script won't paste in Console | Chrome may block multi-line paste; paste `allow pasting` first |
