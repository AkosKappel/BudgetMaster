import { createFileRoute } from '@tanstack/react-router'

import { PUBLIC_PATHS, siteOrigin } from '@/lib/site'

// The app itself is private; only the public pages are worth indexing. Not a static file,
// because the sitemap line needs the absolute address.
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          [
            'User-agent: *',
            ...PUBLIC_PATHS.map((path) => `Allow: ${path}`),
            'Disallow: /',
            '',
            `Sitemap: ${siteOrigin()}/sitemap.xml`,
            '',
          ].join('\n'),
          {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
              'cache-control': 'public, max-age=3600',
            },
          },
        ),
    },
  },
})
