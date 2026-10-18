import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight, Ellipsis, LogOut, Shapes, Users } from 'lucide-react'

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
        <Button variant="outline" onClick={() => signOut()}>
          <LogOut />
          Sign out
        </Button>
      </section>
      <ul className="divide-y rounded-lg border bg-card">
        <li>
          <Link
            to="/spaces"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Users className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">Spaces</span>
              <span className="text-muted-foreground text-sm">
                Shared spaces, members and invites
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/categories"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Shapes className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">Categories</span>
              <span className="text-muted-foreground text-sm">
                Names, groups, icons and colours
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
      </ul>
      <EmptyState icon={Ellipsis}>
        Wallets, tags, recurring payments and settings will live here too.
      </EmptyState>
    </div>
  )
}
