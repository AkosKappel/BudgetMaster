import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ChartColumn,
  ChevronRight,
  FileUp,
  Goal,
  LogOut,
  Repeat,
  Settings,
  Shapes,
  Sparkles,
  Tag,
  Users,
  WalletCards,
  Wand,
} from 'lucide-react'

import { useSignOut } from '@/components/auth-page'
import { accountLabel } from '@/components/demo-banner'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages.js'

export const Route = createFileRoute('/_app/more')({
  head: () => ({ meta: [{ title: `${m.shell_nav_more()} | BudgetMaster` }] }),
  component: More,
})

function More() {
  const { user } = Route.useRouteContext()
  const signOut = useSignOut()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {m.shell_nav_more()}
      </h1>
      <section
        aria-label={m.shell_palette_account()}
        className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {accountLabel(user)}
          </p>
        </div>
        <Button variant="outline" onClick={() => signOut()}>
          <LogOut />
          {m.shell_nav_sign_out()}
        </Button>
      </section>
      <ul className="divide-y rounded-lg border bg-card">
        <li>
          <Link
            to="/settings"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Settings className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{m.shell_nav_settings()}</span>
              <span className="text-sm text-muted-foreground">
                {m.shell_more_settings_hint()}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/spaces"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Users className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{m.shell_palette_spaces()}</span>
              <span className="text-sm text-muted-foreground">
                {m.shell_more_spaces_hint()}
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
              <span className="font-medium">{m.shell_more_wallets()}</span>
              <span className="text-sm text-muted-foreground">
                {m.shell_more_wallets_hint()}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/goals"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Goal className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{m.shell_more_goals()}</span>
              <span className="text-sm text-muted-foreground">
                {m.shell_more_goals_hint()}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/import"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <FileUp className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{m.shell_more_import()}</span>
              <span className="text-sm text-muted-foreground">
                {m.shell_more_import_hint()}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/ask"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Sparkles className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{m.ask_title()}</span>
              <span className="text-sm text-muted-foreground">
                {m.ask_hint()}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/reports"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <ChartColumn className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{m.shell_palette_reports()}</span>
              <span className="text-sm text-muted-foreground">
                {m.shell_more_reports_hint()}
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
              <span className="font-medium">{m.shell_more_recurring()}</span>
              <span className="text-sm text-muted-foreground">
                {m.shell_more_recurring_hint()}
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
              <span className="font-medium">{m.shell_more_categories()}</span>
              <span className="text-sm text-muted-foreground">
                {m.shell_more_categories_hint()}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/rules"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Wand className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{m.shell_more_rules()}</span>
              <span className="text-sm text-muted-foreground">
                {m.shell_more_rules_hint()}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/tags"
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Tag className="size-5 text-muted-foreground" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{m.shell_more_tags()}</span>
              <span className="text-sm text-muted-foreground">
                {m.shell_more_tags_hint()}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
      </ul>
    </div>
  )
}
