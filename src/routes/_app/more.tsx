import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ChevronRight,
  Ellipsis,
  LogOut,
  Repeat,
  Shapes,
  Users,
  WalletCards,
} from 'lucide-react'

import { AccountData } from '@/components/account-data'
import { useSignOut } from '@/components/auth-page'
import { accountLabel } from '@/components/demo-banner'
import { EmptyState } from '@/components/empty-state'
import { ThemeSwitch } from '@/components/theme-switch'
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
          <p className="truncate text-muted-foreground text-sm">
            {accountLabel(user)}
          </p>
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
            to="/wallets"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <WalletCards className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">Wallets</span>
              <span className="text-muted-foreground text-sm">
                Accounts, cards, cash and their balances
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/recurring"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Repeat className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">Recurring</span>
              <span className="text-muted-foreground text-sm">
                Salary, rent and subscriptions, recorded automatically
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
      <ThemeSwitch />
      <AccountData />
      <EmptyState icon={Ellipsis}>
        Tags and more settings will live here too.
      </EmptyState>
    </div>
  )
}
