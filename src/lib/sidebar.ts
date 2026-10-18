import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

const SIDEBAR_COOKIE = 'sidebar'

// Whether the desktop sidebar is the narrow icon strip; read from a cookie on the server so
// the first render already has the right width.
export const getSidebarCollapsed = createIsomorphicFn()
  .server(() => getCookie(SIDEBAR_COOKIE) === 'collapsed')
  .client(() =>
    document.cookie.split('; ').includes(`${SIDEBAR_COOKIE}=collapsed`),
  )

export function saveSidebarCollapsed(collapsed: boolean) {
  // biome-ignore lint/suspicious/noDocumentCookie: a plain preference cookie, read on the server
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? 'collapsed' : 'open'}; path=/; max-age=31536000; samesite=lax`
}
