import { formatForDisplay } from '@tanstack/react-hotkeys'
import { Link, useRouteContext } from '@tanstack/react-router'
import {
  Ellipsis,
  Gauge,
  House,
  LogOut,
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptText,
} from 'lucide-react'
import { motion } from 'motion/react'

import { useSignOut } from '@/components/auth-page'
import { SearchButton } from '@/components/command-palette'
import { accountLabel } from '@/components/demo-banner'
import { Logo, LogoMark } from '@/components/logo'
import { SpaceSwitcher } from '@/components/space-switcher'
import { ThemeMenu } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { snappySpring } from '@/lib/motion'
import { useCanWrite } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { useQuickAdd } from '@/stores/quick-add'

interface NavItem {
  to: '/' | '/activity' | '/budgets' | '/more'
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/activity', label: 'Activity', icon: ReceiptText },
  { to: '/budgets', label: 'Budgets', icon: Gauge },
  { to: '/more', label: 'More', icon: Ellipsis },
]

function TabLink({ to, label, icon: Icon }: NavItem) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="relative flex h-full flex-col items-center justify-center gap-1 text-muted-foreground text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[status=active]:text-foreground"
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="tab-indicator"
              transition={snappySpring}
              className="absolute top-0 h-0.5 w-8 rounded-full bg-note"
            />
          )}
          <Icon className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
          {label}
        </>
      )}
    </Link>
  )
}

export function TabBar() {
  const openNew = useQuickAdd((s) => s.openNew)
  const canWrite = useCanWrite()
  const [first, second, ...rest] = NAV_ITEMS

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {[first, second].map((item) => (
          <li key={item.to}>
            <TabLink {...item} />
          </li>
        ))}
        <li className="flex items-center justify-center">
          {canWrite && (
            <motion.button
              type="button"
              onClick={() => openNew()}
              whileTap={{ scale: 0.9 }}
              aria-label="Add transaction"
              className="-mt-7 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_-4px] shadow-primary/40 outline-none ring-4 ring-background focus-visible:ring-ring"
            >
              <Plus className="size-6" strokeWidth={2.25} />
            </motion.button>
          )}
        </li>
        {rest.map((item) => (
          <li key={item.to}>
            <TabLink {...item} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  // The narrow icon strip; labels stay for screen readers and as tooltips.
  collapsed: boolean
  onToggle: () => void
}) {
  const canWrite = useCanWrite()
  const openNew = useQuickAdd((s) => s.openNew)
  const { user } = useRouteContext({ from: '/_app' })
  const signOut = useSignOut()

  return (
    <aside
      id="sidebar"
      className={cn(
        'sticky top-0 hidden h-dvh flex-col gap-8 border-r bg-card py-6 md:flex print:hidden',
        collapsed ? 'items-center px-2' : 'px-4',
      )}
    >
      <Link
        to="/"
        aria-label={collapsed ? 'BudgetMaster, home' : undefined}
        className="rounded-md px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {collapsed ? <LogoMark /> : <Logo />}
      </Link>
      <SpaceSwitcher
        className={cn('-my-4', collapsed ? 'size-10' : 'w-full')}
        compact={collapsed}
      />
      {!canWrite ? null : collapsed ? (
        <Button
          size="icon-lg"
          onClick={() => openNew()}
          aria-label="Add transaction"
          title="Add transaction"
        >
          <Plus />
        </Button>
      ) : (
        <Button size="lg" onClick={() => openNew()} className="justify-start">
          <Plus />
          Add transaction
        </Button>
      )}
      <SearchButton className="-mt-5" compact={collapsed} />
      <nav aria-label="Main" className={cn(collapsed && 'w-full')}>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: true }}
                title={collapsed ? label : undefined}
                className={cn(
                  'relative isolate flex h-10 items-center gap-3 rounded-md px-3 text-muted-foreground text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:font-medium data-[status=active]:text-foreground',
                  collapsed && 'justify-center px-0',
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="rail-indicator"
                        transition={snappySpring}
                        className="absolute inset-0 -z-10 rounded-md bg-accent"
                      />
                    )}
                    <Icon className="size-4" />
                    <span className={cn(collapsed && 'sr-only')}>{label}</span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div
        className={cn(
          'mt-auto flex items-center gap-2 border-t pt-4',
          collapsed && 'w-full flex-col',
        )}
      >
        {!collapsed && (
          <div className="min-w-0 flex-1 px-3">
            <p className="truncate font-medium text-sm">{user.name}</p>
            <p className="truncate text-muted-foreground text-xs">
              {accountLabel(user)}
            </p>
          </div>
        )}
        <ThemeMenu />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          aria-label="Sign out"
          title={collapsed ? `Sign out ${user.name}` : undefined}
        >
          <LogOut />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-controls="sidebar"
          aria-expanded={!collapsed}
          title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (${formatForDisplay(SIDEBAR_HOTKEY)})`}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
    </aside>
  )
}

export const SIDEBAR_HOTKEY = 'Mod+B'
