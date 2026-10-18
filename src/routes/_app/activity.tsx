import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ReceiptText } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { EmptyState } from '@/components/empty-state'
import { TransactionRow } from '@/components/transaction-row'
import { Button } from '@/components/ui/button'
import { formatDayHeading } from '@/lib/format-date'
import { formatSignedMoney } from '@/lib/money'
import { transactionsQuery, useActiveSpace } from '@/lib/queries'
import { todayIso } from '@/lib/recurrence'
import type { LedgerTransaction } from '@/server/ledger'

export const Route = createFileRoute('/_app/activity')({
  loader: ({ context }) =>
    context.queryClient.ensureInfiniteQueryData(
      transactionsQuery(context.activeSpaceId),
    ),
  head: () => ({ meta: [{ title: 'Activity | BudgetMaster' }] }),
  component: Activity,
})

function groupByDay(items: LedgerTransaction[]) {
  const groups: { date: string; items: LedgerTransaction[] }[] = []
  for (const item of items) {
    const last = groups.at(-1)
    if (last?.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, items: [item] })
  }
  return groups
}

function Activity() {
  const space = useActiveSpace()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(transactionsQuery(space.id))
  const items = data.pages.flatMap((page) => page.items)
  const today = todayIso()
  const sentinel = useRef<HTMLDivElement>(null)

  // Load the next page shortly before the end of the list comes into view.
  useEffect(() => {
    const element = sentinel.current
    if (!element || !hasNextPage) return
    const observer = new IntersectionObserver(
      ([entry]) =>
        entry.isIntersecting && !isFetchingNextPage && fetchNextPage(),
      { rootMargin: '400px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-semibold text-2xl tracking-tight">Activity</h1>
      {items.length === 0 ? (
        <EmptyState icon={ReceiptText}>
          Every income, expense and transfer shows up here, grouped by day.
          Nothing recorded yet.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {groupByDay(items).map((group) => {
            // Net of the day in the space currency; transfers do not change it.
            const net = group.items
              .filter((t) => t.wallet.currency === space.baseCurrency)
              .reduce(
                (sum, t) =>
                  sum +
                  (t.type === 'income'
                    ? t.amount
                    : t.type === 'expense'
                      ? -t.amount
                      : 0),
                0,
              )
            return (
              <section
                key={group.date}
                aria-label={formatDayHeading(group.date, today)}
              >
                <div className="sticky top-0 z-10 -mx-4 flex items-baseline justify-between border-b bg-background/95 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
                  <h2 className="font-medium text-sm">
                    {formatDayHeading(group.date, today)}
                  </h2>
                  {net !== 0 && (
                    <span className="text-muted-foreground text-sm">
                      {formatSignedMoney(net, space.baseCurrency)}
                    </span>
                  )}
                </div>
                <ul className="divide-y">
                  {group.items.map((t) => (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      today={today}
                      showAuthor={space.memberCount > 1}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
          <div ref={sentinel} />
          {hasNextPage ? (
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading' : 'Show older'}
            </Button>
          ) : (
            <p className="text-center text-muted-foreground text-sm">
              That is everything.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
