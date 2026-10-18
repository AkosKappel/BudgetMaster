import { createFileRoute, Outlet } from '@tanstack/react-router'

import { Sidebar, TabBar } from '@/components/app-nav'
import { QuickAddDrawer } from '@/components/quick-add'

export const Route = createFileRoute('/_app')({ component: AppShell })

function AppShell() {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <Sidebar />
      <main className="mx-auto w-full max-w-2xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pt-10 md:pb-10">
        <Outlet />
      </main>
      <TabBar />
      <QuickAddDrawer />
    </div>
  )
}
