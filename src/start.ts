import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start'
import { setResponseHeaders } from '@tanstack/react-start/server'

// Server functions that change data are POST requests; only those need the origin check.
// Page loads stay open to links from other sites.
const csrf = createCsrfMiddleware({
  filter: ({ request }) => !['GET', 'HEAD', 'OPTIONS'].includes(request.method),
})

// A fresh nonce per response lets the router's inline hydration scripts run under a strict
// CSP (getRouter passes it to `ssr.nonce`). Styles allow 'unsafe-inline' because Motion,
// Sonner and Recharts set style attributes, which nonces cannot cover.
const securityHeaders = createMiddleware().server(({ next }) => {
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
  }
  // Vite's dev server injects inline scripts and serves over plain HTTP.
  if (import.meta.env.PROD) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
    headers['Strict-Transport-Security'] = 'max-age=31536000'
  }
  setResponseHeaders(new Headers(headers))
  return next({ context: { nonce } })
})

export const startInstance = createStart(() => ({
  requestMiddleware: [csrf, securityHeaders],
}))
