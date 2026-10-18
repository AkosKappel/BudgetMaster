import { Link } from '@tanstack/react-router'
import {
  Ellipsis,
  Gauge,
  House,
  type LucideIcon,
  Plus,
  ReceiptText,
} from 'lucide-react'
import { motion } from 'motion/react'

import { Button } from '@/components/ui/button'
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

const spring = { type: 'spring', stiffness: 500, damping: 38 } as const

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
              transition={spring}
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
  const setQuickAddOpen = useQuickAdd((s) => s.setOpen)
  const [first, second, ...rest] = NAV_ITEMS

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {[first, second].map((item) => (
          <li key={item.to}>
            <TabLink {...item} />
          </li>
        ))}
        <li className="flex items-center justify-center">
          <motion.button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            whileTap={{ scale: 0.9 }}
            aria-label="Add transaction"
            className="-mt-7 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_-4px] shadow-primary/40 outline-none ring-4 ring-background focus-visible:ring-ring"
          >
            <Plus className="size-6" strokeWidth={2.25} />
          </motion.button>
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

export function Sidebar() {
  const setQuickAddOpen = useQuickAdd((s) => s.setOpen)

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r bg-card px-4 py-6 md:flex">
      <Link to="/" className="px-3 font-semibold text-lg tracking-tight">
        BudgetMaster
      </Link>
      <Button
        size="lg"
        onClick={() => setQuickAddOpen(true)}
        className="justify-start"
      >
        <Plus />
        Add transaction
      </Button>
      <nav aria-label="Main">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: true }}
                className="relative isolate flex h-10 items-center gap-3 rounded-md px-3 text-muted-foreground text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:font-medium data-[status=active]:text-foreground"
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="rail-indicator"
                        transition={spring}
                        className="absolute inset-0 -z-10 rounded-md bg-accent"
                      />
                    )}
                    <Icon className="size-4" />
                    {label}
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
