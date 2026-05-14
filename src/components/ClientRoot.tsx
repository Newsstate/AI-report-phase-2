'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useStore } from '@/store'
import { listGSCProperties, listGA4Properties, getUserInfo } from '@/lib/googleApi'

const AppShell = dynamic(
  () => import('@/components/AppShell').then((m) => m.AppShell),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex', minHeight: '100vh',
        alignItems: 'center', justifyContent: 'center',
        background: '#080E1A',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #1F3A6E, #2E5FA3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: '#fff', fontSize: 18,
            margin: '0 auto 16px',
          }}>SEO</div>
          <p style={{ color: '#6B7E99', fontSize: 14 }}>Loading SEO Report Generator...</p>
        </div>
      </div>
    ),
  }
)

function OAuthHandler() {
  const store = useStore()

  useEffect(() => {
    // Handle OAuth callback token from URL hash
    const hash = window.location.hash
    if (hash && hash.includes('google_token=')) {
      try {
        const tokenParam = hash.split('google_token=')[1]
        const decoded = JSON.parse(decodeURIComponent(tokenParam))
        const { access_token, email, expires_at } = decoded

        if (access_token) {
          store.setGoogleToken(access_token)
          store.setGoogleEmail(email || '')
          store.addLog('Connected as: ' + (email || 'Google User'), 'ok')

          if (expires_at) {
            sessionStorage.setItem('google_token_expires_at', String(expires_at))
          }

          // Clean URL
          window.history.replaceState(null, '', window.location.pathname + window.location.search)

          listGSCProperties(access_token).then(props => {
            store.setGscProperties(props)
            store.addLog('Found ' + props.length + ' Search Console properties.', 'ok')
            if (props[0] && !store.config.gscProperty) store.setConfig({ gscProperty: props[0] })
          }).catch(e => {
            store.addLog('GSC properties: ' + (e instanceof Error ? e.message : String(e)), 'warn')
          })

          listGA4Properties(access_token).then(ga4Props => {
            store.setGa4Properties(ga4Props)
            store.addLog('Found ' + ga4Props.length + ' GA4 properties.', 'ok')
            if (ga4Props[0] && !store.config.ga4PropertyId)
              store.setConfig({ ga4PropertyId: ga4Props[0].propertyId })
          }).catch(e => {
            store.addLog('GA4 properties: ' + (e instanceof Error ? e.message : String(e)), 'warn')
          })
        }
      } catch {
        store.addLog('Failed to parse OAuth token.', 'err')
        window.history.replaceState(null, '', window.location.pathname)
      }
    }

    // Handle auth errors
    const params = new URLSearchParams(window.location.search)
    const authError = params.get('auth_error')
    if (authError) {
      store.addLog('Google auth failed: ' + decodeURIComponent(authError), 'err')
      window.history.replaceState(null, '', window.location.pathname)
    }

    // Check persisted token validity
    const savedToken = store.googleToken
    const expiresAt = sessionStorage.getItem('google_token_expires_at')
    if (savedToken && expiresAt && Date.now() > parseInt(expiresAt)) {
      store.setGoogleToken(null)
      store.setGoogleEmail('')
      store.addLog('Google session expired. Please reconnect.', 'warn')
    } else if (savedToken && store.googleEmail) {
      getUserInfo(savedToken).catch(() => {
        store.setGoogleToken(null)
        store.setGoogleEmail('')
        store.addLog('Google session expired. Please reconnect.', 'warn')
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export function ClientRoot() {
  return (
    <>
      <OAuthHandler />
      <AppShell />
    </>
  )
}
