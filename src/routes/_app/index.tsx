import {
  keepPreviousData,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Plus, ReceiptText } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense } from 'react'
import { z } from 'zod'

import { BudgetMeter, budgetStatus } from '@/components/budget-meter'
import { EmptyState } from '@/components/empty-state'
import { Guilloche } from '@/components/guilloche'
import { TransactionRow } from '@/components/transaction-row'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatShortDate } from '@/lib/format-date'
import { iconFor } from '@/lib/icons'
import { formatMoney, formatSignedMoney } from '@/lib/money'
import {
  budgetReportQuery,
  overviewQuery,
  useActiveSpace,
  useCanWrite,
} from '@/lib/queries'
import { cn } from '@/lib/utils'
import { useQuickAdd } from '@/stores/quick-add'

export const Route = createFileRoute('/_app/')({
  // `?month=-1` shows the previous budget month in the hero, like on Budgets.
  // Optional, so the current month keeps the plain `/` URL.
  validateSearch: z.object({
    month: z.int().min(-36).max(-1).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ month: search.month ?? 0 }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(overviewQuery(context.activeSpaceId)),
      context.queryClient.ensureQueryData(
        budgetReportQuery(context.activeSpaceId, 0),
      ),
      context.queryClient.ensureQueryData(
        budgetReportQuery(context.activeSpaceId, deps.month),
      ),
    ]),
  component: Home,
})

function Home() {
  const space = useActiveSpace()
  const month = Route.useSearch().month ?? 0
  const { data } = useSuspenseQuery(overviewQuery(space.id))
  const { openEdit, openNew } = useQuickAdd()
  const canWrite = useCanWrite()

  return (
    <div className="flex flex-col gap-10">
      <BudgetHero spaceId={space.id} month={month} />

      <PaceSection spaceId={space.id} month={month} />

      {month === 0 && <BudgetWarnings spaceId={space.id} />}

      <section aria-labelledby="wallets" className="flex flex-col gap-3">
        <h2 id="wallets" className="font-semibold text-lg">
          Wallets
        </h2>
        {data.wallets.length === 0 ? (
          <EmptyState
            icon={iconFor('wallet')}
            action={
              <Button size="sm" asChild>
                <Link to="/wallets">
                  <Plus /> Add wallet
                </Link>
              </Button>
            }
          >
            Add a wallet for each account, card or cash you want to track.
          </EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {data.wallets.map((w) => {
              const Icon = iconFor(w.icon)
              return (
                <li key={w.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon
                    className="size-4 shrink-0"
                    style={{ color: w.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{w.name}</span>
                  <span className="font-medium">
                    {w.balance < 0
                      ? formatSignedMoney(w.balance, w.currency)
                      : formatMoney(w.balance, w.currency)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="recent" className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <h2 id="recent" className="font-semibold text-lg">
            Recent
          </h2>
          {data.recent.length > 0 && (
            <Link
              to="/activity"
              className="text-muted-foreground text-sm underline"
            >
              See all
            </Link>
          )}
        </div>
        {data.recent.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            action={
              canWrite && (
                <Button size="sm" onClick={() => openNew()}>
                  <Plus /> Add transaction
                </Button>
              )
            }
          >
            No transactions yet. Add your first one to see where your money
            goes.
          </EmptyState>
        ) : (
          <ul className="divide-y">
            <AnimatePresence initial={false}>
              {data.recent.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  today={data.today}
                  showAuthor={space.memberCount > 1}
                  onSelect={openEdit}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  )
}

// The budget month at a glance: what is left (or how far over), or what was spent without
// a budget. Arrows and a horizontal swipe move between months.
function BudgetHero({ spaceId, month }: { spaceId: string; month: number }) {
  const navigate = useNavigate({ from: '/' })
  // Keeps the shown month while the next one loads: no flash.
  const { data, isPlaceholderData } = useQuery({
    ...budgetReportQuery(spaceId, month),
    placeholderData: keepPreviousData,
  })
  if (!data) return null

  const money = (minor: number) => formatMoney(minor, data.currency)
  const budget = data.overall?.amount ?? null
  const left = budget === null ? null : budget - data.spent
  const over = left !== null && left < 0
  const until = formatShortDate(data.period.end)
  const days = `${data.daysLeft} ${data.daysLeft === 1 ? 'day' : 'days'} left`
  const goTo = (next: number) =>
    next <= 0 &&
    navigate({
      search: { month: next === 0 ? undefined : next },
      replace: true,
    })

  let label: string
  let detail: string
  if (left === null) {
    label = data.isCurrent
      ? `Spent since ${formatShortDate(data.period.start)}`
      : 'Spent'
    detail = data.isCurrent
      ? `Income ${money(data.income)}. ${days}. Set a monthly budget to see what you can still spend.`
      : `Income ${money(data.income)}.`
  } else {
    label = over
      ? 'Over budget by'
      : data.isCurrent
        ? `Left to spend until ${until}`
        : 'Under budget by'
    detail = `Spent ${money(data.spent)} of ${money(budget ?? 0)}.${data.isCurrent ? ` ${days} until ${until}.` : ''}`
  }
  const used = budget ? Math.min(100, (data.spent / budget) * 100) : 0

  return (
    <motion.section
      aria-labelledby="budget-heading"
      className={cn(
        'relative isolate touch-pan-y overflow-hidden rounded-xl border bg-card px-5 pt-3 pb-7 transition-opacity',
        isPlaceholderData && 'opacity-60',
      )}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={(_, info) => {
        if (info.offset.x > 80) goTo(month - 1)
        else if (info.offset.x < -80) goTo(month + 1)
      }}
    >
      <Guilloche className="mask-l-from-55% mask-l-to-90% absolute -top-16 -right-20 -z-10 size-72 text-note/45" />
      <nav
        aria-label="Budget month"
        className="-mx-3 mb-3 flex items-center gap-1 text-muted-foreground text-sm"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          disabled={month <= -36}
          onClick={() => goTo(month - 1)}
        >
          <ChevronLeft />
        </Button>
        <p className="min-w-0 flex-1 text-center" aria-live="polite">
          {data.isCurrent
            ? 'This month'
            : `${formatShortDate(data.period.start)} to ${until}`}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          disabled={month >= 0}
          onClick={() => goTo(month + 1)}
        >
          <ChevronRight />
        </Button>
      </nav>
      <h1 id="budget-heading" className="text-muted-foreground text-sm">
        {label}
      </h1>
      <p
        className={cn(
          'mt-2 font-semibold text-5xl tracking-tight',
          over && 'text-destructive',
        )}
      >
        {money(left === null ? data.spent : Math.abs(left))}
      </p>
      {budget !== null && (
        <div
          role="progressbar"
          aria-label="Budget used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(used)}
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              'h-full rounded-full bg-note',
              over && 'bg-destructive',
            )}
            style={{ width: `${used}%` }}
          />
        </div>
      )}
      <p className="mt-3 max-w-prose text-muted-foreground text-sm">{detail}</p>
    </motion.section>
  )
}

// Category budgets that are close to or over their limit this month; nothing when all is fine.
function BudgetWarnings({ spaceId }: { spaceId: string }) {
  const { data } = useSuspenseQuery(budgetReportQuery(spaceId, 0))
  const warnings = data.categoryBudgets
    .filter((b) => budgetStatus(b.spent, b.amount) !== 'ok')
    .sort((a, b) => b.spent / b.amount - a.spent / a.amount)
  if (warnings.length === 0) return null

  return (
    <section aria-labelledby="warnings" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="warnings" className="font-semibold text-lg">
          Needs attention
        </h2>
        <Link
          to="/budgets"
          className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
        >
          All budgets
        </Link>
      </div>
      <ul className="divide-y rounded-lg border bg-card">
        {warnings.map((b) => {
          const Icon = iconFor(b.icon)
          return (
            <li key={b.id} className="flex flex-col gap-2 px-4 py-3">
              <span className="flex items-center gap-2">
                <Icon
                  className="size-4 shrink-0"
                  style={{ color: b.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {b.name}
                </span>
                <span className="text-sm">
                  {formatMoney(b.spent, data.currency)}
                </span>
              </span>
              <BudgetMeter
                spent={b.spent}
                limit={b.amount}
                currency={data.currency}
                daysLeft={data.daysLeft}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// Recharts is only needed below the fold, so Home's first download stays small.
const SpendingPaceChart = lazy(() =>
  import('@/components/spending-pace-chart').then((module) => ({
    default: module.SpendingPaceChart,
  })),
)

function PaceSection({ spaceId, month }: { spaceId: string; month: number }) {
  const { data } = useQuery({
    ...budgetReportQuery(spaceId, month),
    placeholderData: keepPreviousData,
  })
  if (!data) return null
  return (
    <section aria-labelledby="pace" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="pace" className="font-semibold text-lg">
          Spending pace
        </h2>
        <Link
          to="/budgets"
          search={{ month }}
          className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
        >
          Budgets
        </Link>
      </div>
      <Suspense fallback={<Skeleton className="h-72 rounded-lg" />}>
        <SpendingPaceChart
          pace={data.pace}
          budget={data.overall?.amount ?? null}
          currency={data.currency}
          isCurrent={data.isCurrent}
        />
      </Suspense>
    </section>
  )
}
