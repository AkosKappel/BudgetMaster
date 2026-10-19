import { createIsomorphicFn } from '@tanstack/react-start'

// The public pages: allowed in robots.txt, listed in the sitemap, given canonical URLs.
export const PUBLIC_PATHS = [
  '/about',
  '/faq',
  '/privacy',
  '/terms',
  '/security',
  '/sign-in',
  '/sign-up',
] as const

// The public address: BETTER_AUTH_URL on the server, the page's own origin in the browser
// (the same address, as the app is only reached through it). Read from process.env, not
// `@/env`, so this client-bundled module never imports the server's settings.
export const siteOrigin = createIsomorphicFn()
  .server(
    () =>
      new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').origin,
  )
  .client(() => window.location.origin)

// Adds the canonical link and Open Graph URL of a public page to its route `head`.
export function withCanonical<T extends { meta?: object[]; links?: object[] }>(
  path: (typeof PUBLIC_PATHS)[number],
  head: T,
) {
  const url = `${siteOrigin()}${path}`
  return {
    ...head,
    meta: [...(head.meta ?? []), { property: 'og:url', content: url }],
    links: [...(head.links ?? []), { rel: 'canonical', href: url }],
  }
}
