import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, ReceiptText } from 'lucide-react'
import { AnimatePresence } from 'motion/react'

import { BudgetMeter, budgetStatus } from '@/components/budget-meter'
import { EmptyState } from '@/components/empty-state'
import { Guilloche } from '@/components/guilloche'
import { TransactionRow } from '@/components/transaction-row'
import { Button } from '@/components/ui/button'
import { formatShortDate } from '@/lib/format-date'
import { iconFor } from '@/lib/icons'
import { formatMoney, formatSignedMoney } from '@/lib/money'
import { budgetReportQuery, overviewQuery, useActiveSpace } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { useQuickAdd } from '@/stores/quick-add'

export const Route = createFileRoute('/_app/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(overviewQuery(context.activeSpaceId)),
      context.queryClient.ensureQueryData(
        budgetReportQuery(context.activeSpaceId, 0),
      ),
    ]),
  component: Home,
})

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)

function Home() {
  const space = useActiveSpace()
  const { data } = useSuspenseQuery(overviewQuery(space.id))
  const { openEdit, openNew } = useQuickAdd()
  const money = (minor: number) => formatMoney(minor, space.baseCurrency)
  const daysLeft = daysBetween(data.today, data.period.end) + 1
  const daysText = `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left.`

  return (
    <div className="flex flex-col gap-10">
      <BudgetHero
        budget={data.budget}
        spent={data.spent}
        income={data.income}
        periodStart={data.period.start}
        periodEnd={data.period.end}
        daysText={daysText}
        money={money}
      />

      <BudgetWarnings spaceId={space.id} />

      <section aria-labelledby="wallets" className="flex flex-col gap-3">
        <h2 id="wallets" className="font-semibold text-lg">
          Wallets
        </h2>
        {data.wallets.length === 0 ? (
          <EmptyState icon={iconFor('wallet')}>
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
              <Button size="sm" onClick={() => openNew()}>
                <Plus /> Add transaction
              </Button>
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

interface HeroProps {
  budget: number | null
  spent: number
  income: number
  periodStart: string
  periodEnd: string
  daysText: string
  money: (minor: number) => string
}

function BudgetHero({
  budget,
  spent,
  income,
  periodStart,
  periodEnd,
  daysText,
  money,
}: HeroProps) {
  const left = budget === null ? null : budget - spent
  const over = left !== null && left < 0

  let label = `Spent since ${formatShortDate(periodStart)}`
  let amount = money(spent)
  let detail = `Income ${money(income)}. ${daysText} Set a monthly budget to see what you can still spend.`
  if (budget !== null && left !== null) {
    label = over
      ? 'Over budget by'
      : `Left to spend until ${formatShortDate(periodEnd)}`
    amount = money(Math.abs(left))
    detail = `Spent ${money(spent)} of ${money(budget)}. ${daysText.replace('.', ` until ${formatShortDate(periodEnd)}.`)}`
  }
  const used = budget ? Math.min(100, (spent / budget) * 100) : 0

  return (
    <section
      aria-labelledby="budget-heading"
      className="relative isolate overflow-hidden rounded-xl border bg-card px-5 py-7"
    >
      <Guilloche className="mask-l-from-55% mask-l-to-90% absolute -top-16 -right-20 -z-10 size-72 text-note/45" />
      <h1 id="budget-heading" className="text-muted-foreground text-sm">
        {label}
      </h1>
      <p
        className={cn(
          'mt-2 font-semibold text-5xl tracking-tight',
          over && 'text-destructive',
        )}
      >
        {amount}
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
    </section>
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
