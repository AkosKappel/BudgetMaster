import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import {
  createIsomorphicFn,
  getGlobalStartContext,
} from '@tanstack/react-start'
import { NotFound, RouteError } from './components/route-status'
import { getContext } from './integrations/tanstack-query/root-provider'
import { routeTree } from './routeTree.gen'

// The CSP nonce of this response (src/start.ts). The client reads it back from the
// `csp-nonce` meta tag the router renders, so hydration matches.
const getNonce = createIsomorphicFn()
  .server(
    () => (getGlobalStartContext() as { nonce?: string } | undefined)?.nonce,
  )
  .client(
    () =>
      document
        .querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')
        ?.getAttribute('content') ?? undefined,
  )

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    ssr: { nonce: getNonce() },
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFound,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
