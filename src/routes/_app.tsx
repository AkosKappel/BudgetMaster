import { useHotkey } from '@tanstack/react-hotkeys'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { Suspense, useState } from 'react'

import { SIDEBAR_HOTKEY, Sidebar, TabBar } from '@/components/app-nav'
import { CrossTabSync, OfflineNotice } from '@/components/app-sync'
import { CommandPalette, SearchButton } from '@/components/command-palette'
import { DemoBanner } from '@/components/demo-banner'
import { QuickAddDrawer } from '@/components/quick-add'
import { ShortcutsHelp } from '@/components/shortcuts-help'
import { SpaceSwitcher } from '@/components/space-switcher'
import { Skeleton } from '@/components/ui/skeleton'
import { formOptionsQuery, sessionQuery, spacesQuery } from '@/lib/queries'
import { getSidebarCollapsed, saveSidebarCollapsed } from '@/lib/sidebar'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)
    if (!session) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
    const { activeId } = await context.queryClient.ensureQueryData(spacesQuery)
    if (!activeId) throw new Error('This account has no space.')
    return {
      user: session.user,
      activeSpaceId: activeId,
      sidebarCollapsed: getSidebarCollapsed(),
    }
  },
  // Not awaited: the quick add sheet usually opens later, and suspends if it is faster.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(
      formOptionsQuery(context.activeSpaceId),
    )
  },
  // Personal data: keep every app page out of search engines (robots.txt also says so).
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: AppShell,
})

function AppShell() {
  const context = Route.useRouteContext()
  const [collapsed, setCollapsed] = useState(context.sidebarCollapsed)
  const toggle = () => {
    saveSidebarCollapsed(!collapsed)
    setCollapsed(!collapsed)
  }
  useHotkey(SIDEBAR_HOTKEY, toggle)

  return (
    <div
      className={cn(
        'min-h-dvh md:grid print:block',
        collapsed ? 'md:grid-cols-[3.5rem_1fr]' : 'md:grid-cols-[15rem_1fr]',
      )}
    >
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className="mx-auto w-full max-w-2xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pt-10 md:pb-10 print:max-w-none print:p-0">
        <header className="-mx-3 mb-4 flex items-center gap-1 md:hidden print:hidden">
          <SpaceSwitcher className="min-w-0 flex-1" />
          <SearchButton compact />
        </header>
        <OfflineNotice />
        <DemoBanner />
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <TabBar />
      <QuickAddDrawer />
      <CommandPalette />
      <CrossTabSync />
      <ShortcutsHelp />
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
