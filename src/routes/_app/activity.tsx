import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, ReceiptText, SearchX } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { ActivityFilters } from '@/components/activity-filters'
import { EmptyState } from '@/components/empty-state'
import { TransactionRow } from '@/components/transaction-row'
import { Button } from '@/components/ui/button'
import { formatDayHeading } from '@/lib/format-date'
import { formatSignedMoney } from '@/lib/money'
import { useDeleteWithUndo } from '@/lib/mutations'
import { transactionsQuery, useActiveSpace, useCanWrite } from '@/lib/queries'
import { currentDay } from '@/lib/today'
import {
  activeFilterCount,
  transactionFiltersSchema,
} from '@/lib/transaction-filters'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import type { LedgerTransaction } from '@/server/ledger'
import { useQuickAdd } from '@/stores/quick-add'

export const Route = createFileRoute('/_app/activity')({
  validateSearch: transactionFiltersSchema,
  // Not loaderDeps: a new filter would remount the page and the search field with it.
  // Later filter changes load in the component and keep the previous list meanwhile.
  loader: ({ context, location }) =>
    context.queryClient.ensureInfiniteQueryData(
      transactionsQuery(
        context.activeSpaceId,
        transactionFiltersSchema.parse(location.search),
      ),
    ),
  head: () => ({
    meta: [{ title: `${m.txn_activity_title()} | BudgetMaster` }],
  }),
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
  const filters = Route.useSearch()
  const navigate = Route.useNavigate()
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPlaceholderData,
  } = useInfiniteQuery({
    ...transactionsQuery(space.id, filters),
    placeholderData: keepPreviousData,
  })
  const items = data?.pages.flatMap((page) => page.items) ?? []
  const filtered = activeFilterCount(filters) > 0
  // Remounts the filter fields once the cleared URL is in place, so typed values go too.
  const [clearCount, setClearCount] = useState(0)
  const clearFilters = () =>
    navigate({ search: {}, replace: true }).then(() =>
      setClearCount((count) => count + 1),
    )
  const today = currentDay()
  const sentinel = useRef<HTMLDivElement>(null)
  const { openEdit, openNew } = useQuickAdd()
  const canWrite = useCanWrite()
  const deleteWithUndo = useDeleteWithUndo(space.id)

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
      <h1 className="text-2xl font-semibold tracking-tight">
        {m.txn_activity_title()}
      </h1>
      <ActivityFilters
        key={clearCount}
        spaceId={space.id}
        filters={filters}
        onClear={clearFilters}
      />
      {items.length === 0 && filtered ? (
        <EmptyState
          icon={SearchX}
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              {m.txn_activity_clear_filters()}
            </Button>
          }
        >
          {m.txn_activity_no_match()}
        </EmptyState>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          action={
            canWrite && (
              <Button size="sm" onClick={() => openNew()}>
                <Plus /> {m.txn_activity_add()}
              </Button>
            )
          }
        >
          {m.txn_activity_empty()}
        </EmptyState>
      ) : (
        <div
          className={cn(
            'flex flex-col gap-6 transition-opacity',
            isPlaceholderData && 'opacity-60',
          )}
          aria-busy={isPlaceholderData}
        >
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
                  <h2 className="text-sm font-medium">
                    {formatDayHeading(group.date, today)}
                  </h2>
                  {net !== 0 && (
                    <span className="text-sm text-muted-foreground">
                      {formatSignedMoney(net, space.baseCurrency)}
                    </span>
                  )}
                </div>
                <ul className="divide-y">
                  <AnimatePresence initial={false}>
                    {group.items.map((t) => (
                      <TransactionRow
                        key={t.id}
                        transaction={t}
                        today={today}
                        showAuthor={space.memberCount > 1}
                        onSelect={openEdit}
                        onDelete={canWrite ? deleteWithUndo : undefined}
                      />
                    ))}
                  </AnimatePresence>
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
              {isFetchingNextPage
                ? m.txn_activity_loading()
                : m.txn_activity_show_older()}
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {m.txn_activity_end()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
