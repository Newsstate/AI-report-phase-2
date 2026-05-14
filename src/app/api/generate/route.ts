import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Claude API not configured on server.' }, { status: 500 })
  }

  try {
    const body = await req.json()

    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Invalid request: messages array required.' }, { status: 400 })
    }

    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      body.model      || 'claude-sonnet-4-6',
        max_tokens: body.max_tokens || 6000,
        messages:   body.messages,
      }),
    })

    if (!claudeRes.ok) {
      const e = await claudeRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: e.error?.message || claudeRes.statusText },
        { status: claudeRes.status }
      )
    }

    const data = await claudeRes.json()
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
