import {
  type InfiniteData,
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'

import { notifyOtherTabs } from '@/components/app-sync'

import { haptic } from '@/lib/haptics'
import { overviewQuery, transactionsQuery } from '@/lib/queries'
import type { LedgerTransaction, TransactionCursor } from '@/server/ledger'
import {
  createTransaction,
  deleteTransaction,
  type TransactionInput,
  updateTransaction,
} from '@/server/transactions'

type ListData = InfiniteData<
  { items: LedgerTransaction[]; nextCursor: TransactionCursor | null },
  unknown
>

// Same order as the server: date, then id (UUIDv7, so creation time), newest first.
const isNewer = (a: LedgerTransaction, b: LedgerTransaction) =>
  a.date > b.date || (a.date === b.date && a.id > b.id)

// Puts `row` where the server would list it among the loaded pages. A row older than
// everything loaded is only added when the last page is loaded too.
export function upsertInList(data: ListData, row: LedgerTransaction): ListData {
  const pages = data.pages.map((page) => ({
    ...page,
    items: page.items.filter((t) => t.id !== row.id),
  }))
  for (const page of pages) {
    const index = page.items.findIndex((t) => isNewer(row, t))
    if (index !== -1) {
      page.items.splice(index, 0, row)
      return { ...data, pages }
    }
  }
  const last = pages.at(-1)
  if (last && !last.nextCursor) last.items.push(row)
  return { ...data, pages }
}

export function removeFromList(data: ListData, id: string): ListData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((t) => t.id !== id),
    })),
  }
}

// Updates a row only where it is already listed: a filtered list cannot tell whether the
// changed row still matches, so it refetches when the mutation settles.
export function replaceInList(
  data: ListData,
  row: LedgerTransaction,
): ListData {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((t) => (t.id === row.id ? row : t)),
    })),
  }
}

// Applies a change to every cached list (`changeFiltered` for the filtered ones) and the
// Home "recent" list at once. Balances and totals are not guessed: they refetch when the
// mutation settles.
function patchCaches(
  queryClient: QueryClient,
  spaceId: string,
  change: (list: ListData) => ListData,
  changeRecent: (
    recent: LedgerTransaction[],
    today: string,
  ) => LedgerTransaction[],
  changeFiltered = change,
) {
  const unfiltered = transactionsQuery(spaceId).queryKey
  for (const [key, data] of queryClient.getQueriesData<ListData>({
    queryKey: unfiltered.slice(0, 3),
  })) {
    if (!data) continue
    const filtered = JSON.stringify(key) !== JSON.stringify(unfiltered)
    queryClient.setQueryData(key, (filtered ? changeFiltered : change)(data))
  }
  queryClient.setQueryData(overviewQuery(spaceId).queryKey, (data) =>
    data ? { ...data, recent: changeRecent(data.recent, data.today) } : data,
  )
}

const upsertRecent =
  (row: LedgerTransaction) => (recent: LedgerTransaction[], today: string) =>
    [row, ...recent.filter((t) => t.id !== row.id)]
      .filter((t) => t.date <= today)
      .sort((a, b) => (isNewer(a, b) ? -1 : 1))
      .slice(0, 5)

interface SaveVariables {
  mode: 'create' | 'edit'
  input: TransactionInput
  // The row as the list will show it, built from the form options.
  optimistic: LedgerTransaction
}

export function useSaveTransaction(spaceId: string) {
  const queryClient = useQueryClient()
  const spaceKey = ['space', spaceId]

  return useMutation({
    mutationFn: ({ mode, input }: SaveVariables) =>
      mode === 'create'
        ? createTransaction({ data: input })
        : updateTransaction({ data: input }),
    onMutate: async ({ optimistic }) => {
      haptic('confirm')
      await queryClient.cancelQueries({ queryKey: spaceKey })
      const previous = {
        list: queryClient.getQueryData(transactionsQuery(spaceId).queryKey),
        overview: queryClient.getQueryData(overviewQuery(spaceId).queryKey),
      }
      patchCaches(
        queryClient,
        spaceId,
        (list) => upsertInList(list, optimistic),
        upsertRecent(optimistic),
        (list) => replaceInList(list, optimistic),
      )
      return previous
    },
    onError: (error, _variables, previous) => {
      queryClient.setQueryData(
        transactionsQuery(spaceId).queryKey,
        previous?.list,
      )
      queryClient.setQueryData(
        overviewQuery(spaceId).queryKey,
        previous?.overview,
      )
      toast.error(error.message || 'Could not save. Try again.')
    },
    onSuccess: (_result, { mode, optimistic }) => {
      const kind =
        optimistic.type === 'transfer'
          ? 'Transfer'
          : optimistic.type === 'income'
            ? 'Income'
            : 'Expense'
      toast.success(`${kind} ${mode === 'create' ? 'saved' : 'updated'}`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: spaceKey }),
  })
}

// Removes the row at once and deletes it on the server only when the undo toast closes
// without Undo. Closing the tab before that keeps the transaction: the safe direction.
export function useDeleteWithUndo(spaceId: string) {
  const queryClient = useQueryClient()

  return (row: LedgerTransaction) => {
    let undone = false
    let committed = false
    patchCaches(
      queryClient,
      spaceId,
      (list) => removeFromList(list, row.id),
      (recent) => recent.filter((t) => t.id !== row.id),
    )
    const restore = () =>
      patchCaches(
        queryClient,
        spaceId,
        (list) => upsertInList(list, row),
        upsertRecent(row),
        (list) => list,
      )
    const commit = () => {
      if (undone || committed) return
      committed = true
      deleteTransaction({ data: { spaceId, id: row.id } })
        .catch((error: Error) => {
          restore()
          toast.error(error.message || 'Could not delete. Try again.')
        })
        .finally(() => {
          queryClient.invalidateQueries({ queryKey: ['space', spaceId] })
          // Not a useMutation, so CrossTabSync does not see it.
          notifyOtherTabs()
        })
    }

    haptic('delete')
    toast('Transaction deleted', {
      description: row.payee ?? row.category?.name ?? undefined,
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true
          restore()
          // Filtered lists cannot tell whether the row belongs back in them.
          queryClient.invalidateQueries({
            queryKey: ['space', spaceId, 'transactions'],
          })
        },
      },
      onAutoClose: commit,
      onDismiss: commit,
    })
  }
}
