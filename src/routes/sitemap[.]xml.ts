import { createFileRoute } from '@tanstack/react-router'

import { PUBLIC_PATHS, siteOrigin } from '@/lib/site'

// Built per request because the address comes from the environment.
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const urls = PUBLIC_PATHS.map(
          (path) => `  <url><loc>${siteOrigin()}${path}</loc></url>`,
        ).join('\n')
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
          {
            headers: {
              'content-type': 'application/xml; charset=utf-8',
              'cache-control': 'public, max-age=3600',
            },
          },
        )
      },
    },
  },
})
