import {
  infiniteQueryOptions,
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useState } from 'react'
import type { TransactionFilters } from '@/lib/transaction-filters'
import { getSession, getSignInOptions } from '@/server/auth'
import { getBudgetReport } from '@/server/budgets'
import { listCategories } from '@/server/categories'
import { listDevices } from '@/server/devices'
import { listGoals } from '@/server/goals'
import { listImports } from '@/server/import'
import {
  getOverview,
  listTransactions,
  searchTransactions,
  type TransactionCursor,
} from '@/server/ledger'
import { listRecurringRules } from '@/server/recurring'
import {
  getCashFlow,
  getCategoryTrends,
  getForecast,
  getNetWorth,
  getPriceChanges,
  getSpendingCalendar,
} from '@/server/reports'
import { listRules } from '@/server/rules'
import { getInvite, getSpaceDetails, listActivity } from '@/server/space-admin'
import { getSpaces, setActiveSpace } from '@/server/spaces'
import { listTags } from '@/server/tags'
import { getFormOptions, suggestPayees } from '@/server/transactions'
import { listWallets } from '@/server/wallets'

export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: () => getSession(),
  staleTime: 5 * 60_000,
})

export const devicesQuery = queryOptions({
  queryKey: ['devices'],
  queryFn: () => listDevices(),
})

export const signInOptionsQuery = queryOptions({
  queryKey: ['sign-in-options'],
  queryFn: () => getSignInOptions(),
  staleTime: Number.POSITIVE_INFINITY,
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

export const tagsQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'tags'],
    queryFn: () => listTags({ data: { spaceId } }),
  })

export const netWorthQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'net-worth'],
    queryFn: () => getNetWorth({ data: { spaceId } }),
  })

export const forecastQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'forecast'],
    queryFn: () => getForecast({ data: { spaceId } }),
  })

export const goalsQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'goals'],
    queryFn: () => listGoals({ data: { spaceId } }),
  })

export const importsQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'imports'],
    queryFn: () => listImports({ data: { spaceId } }),
  })

export const priceChangesQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'price-changes'],
    queryFn: () => getPriceChanges({ data: { spaceId } }),
  })

export const spendingCalendarQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'spending-calendar'],
    queryFn: () => getSpendingCalendar({ data: { spaceId } }),
  })

export const rulesQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'rules'],
    queryFn: () => listRules({ data: { spaceId } }),
  })

export const categoryTrendsQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'category-trends'],
    queryFn: () => getCategoryTrends({ data: { spaceId } }),
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

export const activityQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'activity-log'],
    queryFn: () => listActivity({ data: { spaceId } }),
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

// Viewers can look but not change anything; the server refuses their writes anyway, so
// the add and delete actions are simply not offered.
export function useCanWrite() {
  return useActiveSpace().role !== 'viewer'
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
