import {
  infiniteQueryOptions,
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useState } from 'react'

import { getSession } from '@/server/auth'
import {
  getOverview,
  listTransactions,
  searchTransactions,
  type TransactionCursor,
} from '@/server/ledger'
import { getSpaces, setActiveSpace } from '@/server/spaces'
import { getFormOptions, suggestPayees } from '@/server/transactions'

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

export const transactionsQuery = (spaceId: string) =>
  infiniteQueryOptions({
    queryKey: ['space', spaceId, 'transactions'],
    queryFn: ({ pageParam }) =>
      listTransactions({ data: { spaceId, cursor: pageParam } }),
    initialPageParam: undefined as TransactionCursor | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

export const formOptionsQuery = (spaceId: string) =>
  queryOptions({
    queryKey: ['space', spaceId, 'form-options'],
    queryFn: () => getFormOptions({ data: { spaceId } }),
    staleTime: 60_000,
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
