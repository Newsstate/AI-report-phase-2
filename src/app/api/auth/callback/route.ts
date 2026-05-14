import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?auth_error=${error || 'no_code'}`)
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const e = await tokenRes.json()
      throw new Error(e.error_description || 'Token exchange failed')
    }

    const tokens = await tokenRes.json()
    // access_token, refresh_token, expires_in

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const user = await userRes.json()

    // Build redirect with token info encoded in fragment (stays client-side only)
    // We pass the access_token to the frontend via URL fragment so it's never logged
    const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000
    const payload = encodeURIComponent(JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
      email: user.email,
      name: user.name,
    }))

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '/'
    // Redirect to app with token in hash (never hits server logs)
    return NextResponse.redirect(`${appUrl}/?auth_success=1#google_token=${payload}`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'auth_failed'
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?auth_error=${encodeURIComponent(msg)}`)
  }
}
