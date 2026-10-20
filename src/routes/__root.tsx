import { TanStackDevtools } from '@tanstack/react-devtools'
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools'
import { pacerDevtoolsPlugin } from '@tanstack/react-pacer-devtools'
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { siteOrigin } from '@/lib/site'
import { getTheme } from '@/lib/theme'
import { TIME_ZONE_COOKIE } from '@/lib/today'
import { getLocale } from '@/paraglide/runtime.js'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import appCss from '../styles.css?url'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        name: 'theme-color',
        media: '(prefers-color-scheme: light)',
        content: '#f1f4ef',
      },
      {
        name: 'theme-color',
        media: '(prefers-color-scheme: dark)',
        content: '#0f1d1a',
      },
      {
        title: 'BudgetMaster',
      },
      {
        name: 'description',
        content:
          'Track income, expenses and budgets on your phone, alone or with a partner. Try the demo without signing up.',
      },
      // Link previews in chats and social posts. Pages keep their own title.
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'BudgetMaster' },
      { property: 'og:title', content: 'BudgetMaster' },
      {
        property: 'og:description',
        content:
          'Income, spending and budgets on your phone, alone or shared with a partner. Try the demo, no sign-up needed.',
      },
      { property: 'og:image', content: `${siteOrigin()}/og-image.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content:
          'BudgetMaster logo and the line "Try the demo, no sign-up needed"',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    // Zod 4 compiles schemas with `new Function` unless told not to, and even its caught
    // probe is reported as a CSP violation. The setting is read when a schema is created,
    // so it has to exist before any module runs: an inline script (it gets the CSP nonce).
    scripts: [{ children: 'globalThis.__zod_globalConfig={jitless:true}' }],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
  }),
  beforeLoad: () => ({ theme: getTheme() }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { theme } = Route.useRouteContext()
  return (
    // The theme switch changes data-theme on the client before the next render.
    <html lang={getLocale()} data-theme={theme} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <TimeZoneCookie />
        <ServiceWorker />
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
        <Toaster />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
            formDevtoolsPlugin(),
            pacerDevtoolsPlugin(),
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

// Lets the server compute "today" on the user's clock (src/lib/today.ts).
function TimeZoneCookie() {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    // biome-ignore lint/suspicious/noDocumentCookie: a plain preference cookie, read on the server
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`
  }, [])
  return null
}

// Installable app with an offline page (public/sw.js). Production only: in development
// it would serve stale Vite modules.
function ServiceWorker() {
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js')
  }, [])
  return null
}
