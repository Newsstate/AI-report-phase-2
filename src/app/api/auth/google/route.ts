import { NextResponse } from 'next/server'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
  || (process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
    : null)

export async function GET() {
  if (!CLIENT_ID) {
    return NextResponse.json({ error: 'Google OAuth not configured: missing GOOGLE_CLIENT_ID' }, { status: 500 })
  }
  if (!REDIRECT_URI) {
    return NextResponse.json({ error: 'Google OAuth not configured: missing GOOGLE_REDIRECT_URI or NEXT_PUBLIC_APP_URL' }, { status: 500 })
  }

  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics.edit',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'email',
    'profile',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'select_account consent',
    include_granted_scopes: 'true',
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return NextResponse.json({ url })
}
