import { createFileRoute } from '@tanstack/react-router'
import { Ellipsis, LogOut } from 'lucide-react'

import { useSignOut } from '@/components/auth-page'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_app/more')({
  head: () => ({ meta: [{ title: 'More | BudgetMaster' }] }),
  component: More,
})

function More() {
  const { user } = Route.useRouteContext()
  const signOut = useSignOut()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-semibold text-2xl tracking-tight">More</h1>
      <section
        aria-label="Account"
        className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-muted-foreground text-sm">{user.email}</p>
        </div>
        <Button variant="outline" onClick={signOut}>
          <LogOut />
          Sign out
        </Button>
      </section>
      <EmptyState icon={Ellipsis}>
        Wallets, categories, tags, recurring payments and settings will live
        here.
      </EmptyState>
    </div>
  )
}
