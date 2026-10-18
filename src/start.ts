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

// One JSON line per request in production, for `docker compose logs`. The query string is
// left out: it can hold search text such as payee names. Errors keep their stack trace.
const requestLog = createMiddleware().server(async ({ request, next }) => {
  if (!import.meta.env.PROD) return next()
  const started = performance.now()
  const id = crypto.randomUUID()
  setResponseHeaders(new Headers({ 'X-Request-Id': id }))
  const entry = {
    id,
    method: request.method,
    path: new URL(request.url).pathname,
  }
  try {
    const result = await next()
    console.log(
      JSON.stringify({
        ...entry,
        status: result.response.status,
        ms: Math.round(performance.now() - started),
      }),
    )
    return result
  } catch (error) {
    const ms = Math.round(performance.now() - started)
    // The browser went away (closed tab, cancelled fetch): not a server error.
    if (request.signal.aborted) {
      console.log(JSON.stringify({ ...entry, status: 499, ms }))
    } else {
      console.error(
        JSON.stringify({
          ...entry,
          status: 500,
          ms,
          error: error instanceof Error ? error.stack : String(error),
        }),
      )
    }
    throw error
  }
})

export const startInstance = createStart(() => ({
  requestMiddleware: [requestLog, csrf, securityHeaders],
}))
