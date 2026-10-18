import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'

import { Sidebar, TabBar } from '@/components/app-nav'
import { QuickAddDrawer } from '@/components/quick-add'
import { SpaceSwitcher } from '@/components/space-switcher'
import { Skeleton } from '@/components/ui/skeleton'
import { formOptionsQuery, sessionQuery, spacesQuery } from '@/lib/queries'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)
    if (!session) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
    const { activeId } = await context.queryClient.ensureQueryData(spacesQuery)
    if (!activeId) throw new Error('This account has no space.')
    return { user: session.user, activeSpaceId: activeId }
  },
  // Not awaited: the quick add sheet usually opens later, and suspends if it is faster.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(
      formOptionsQuery(context.activeSpaceId),
    )
  },
  component: AppShell,
})

function AppShell() {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <Sidebar />
      <main className="mx-auto w-full max-w-2xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pt-10 md:pb-10">
        <header className="-mx-3 mb-4 md:hidden">
          <SpaceSwitcher className="max-w-full" />
        </header>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <TabBar />
      <QuickAddDrawer />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-busy="true">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-6 w-32" />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  )
}
