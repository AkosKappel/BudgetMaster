import {
  infiniteQueryOptions,
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useState } from 'react'
import type { TransactionFilters } from '@/lib/transaction-filters'
import { getSession } from '@/server/auth'
import { getBudgetReport } from '@/server/budgets'
import { listCategories } from '@/server/categories'
import {
  getOverview,
  listTransactions,
  searchTransactions,
  type TransactionCursor,
} from '@/server/ledger'
import { listRecurringRules } from '@/server/recurring'
import { getCashFlow } from '@/server/reports'
import { getInvite, getSpaceDetails } from '@/server/space-admin'
import { getSpaces, setActiveSpace } from '@/server/spaces'
import { getFormOptions, suggestPayees } from '@/server/transactions'
import { listWallets } from '@/server/wallets'

export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: () => getSession(),
  staleTime: 5 * 60_000,
})

export const spacesQuery = queryOptions({
  queryKey: ['spaces'],
  queryFn: () => getSpaces(),
})

// Keys start with the space id, so switching spaces never mixes cached data.
export const overviewQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'overview'],
    queryFn: () => getOverview({ data: { spaceId } }),
  })

export const transactionsQuery = (
  spaceId: string,
  filters: TransactionFilters = {},
) =>
  infiniteQueryOptions({
    queryKey: ['space', spaceId, 'transactions', filters],
    queryFn: ({ pageParam }) =>
      listTransactions({ data: { spaceId, cursor: pageParam, filters } }),
    initialPageParam: undefined as TransactionCursor | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

export const formOptionsQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'form-options'],
    queryFn: () => getFormOptions({ data: { spaceId } }),
    staleTime: 60_000,
  })

export const categoriesQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'categories'],
    queryFn: () => listCategories({ data: { spaceId } }),
  })

export const walletsQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'wallets'],
    queryFn: () => listWallets({ data: { spaceId } }),
  })

export const recurringQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'recurring'],
    queryFn: () => listRecurringRules({ data: { spaceId } }),
  })

export const cashFlowQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'cash-flow'],
    queryFn: () => getCashFlow({ data: { spaceId } }),
  })

export const payeesQuery = (spaceId: string, query: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'payees', query],
    queryFn: () => suggestPayees({ data: { spaceId, query } }),
    staleTime: 60_000,
  })

export const searchQuery = (spaceId: string, query: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'search', query],
    queryFn: () => searchTransactions({ data: { spaceId, query } }),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })

export const spaceDetailsQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'details'],
    queryFn: () => getSpaceDetails({ data: { spaceId } }),
  })

export const inviteQuery = (token: string) =>
  queryOptions({
    queryKey: ['invite', token],
    queryFn: () => getInvite({ data: { token } }),
  })

export const budgetReportQuery = (spaceId: string, offset: number) =>
  queryOptions({
    queryKey: ['space', spaceId, 'budgets', offset],
    queryFn: () => getBudgetReport({ data: { spaceId, offset } }),
  })

export function useSpaces() {
  return useSuspenseQuery(spacesQuery).data
}

export function useActiveSpace() {
  const { spaces, activeId } = useSpaces()
  const active = spaces.find((s) => s.id === activeId)
  if (!active) throw new Error('No space available')
  return active
}

// Loads the target space's data before switching, so the screen changes in one step
// instead of flashing a loading state.
export function useSwitchSpace() {
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function switchTo(spaceId: string) {
    setPendingId(spaceId)
    try {
      await Promise.all([
        queryClient.ensureQueryData(overviewQuery(spaceId)),
        queryClient.prefetchInfiniteQuery(transactionsQuery(spaceId)),
        setActiveSpace({ data: { spaceId } }),
      ])
      queryClient.setQueryData(spacesQuery.queryKey, (old) =>
        old ? { ...old, activeId: spaceId } : old,
      )
    } finally {
      setPendingId(null)
    }
  }

  return { switchTo, pendingId }
}
