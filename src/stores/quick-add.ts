import { create } from 'zustand'

import type { LedgerTransaction } from '@/server/ledger'

export type TransactionType = LedgerTransaction['type']

// What the transaction sheet shows: a new transaction of a type, or an existing one to edit.
// It opens from the tab bar, the sidebar and transaction rows.
type Draft =
  | { mode: 'create'; type: TransactionType }
  | { mode: 'edit'; transaction: LedgerTransaction }

interface QuickAddState {
  draft: Draft | null
  // The element that opened the sheet; focus returns there on close (there is no Radix
  // trigger to do it, the sheet opens from several places).
  returnFocus: HTMLElement | null
  openNew: (type?: TransactionType) => void
  openEdit: (transaction: LedgerTransaction) => void
  close: () => void
}

const activeElement = () =>
  document.activeElement instanceof HTMLElement ? document.activeElement : null

export const useQuickAdd = create<QuickAddState>()((set) => ({
  draft: null,
  returnFocus: null,
  openNew: (type = 'expense') =>
    set({ draft: { mode: 'create', type }, returnFocus: activeElement() }),
  openEdit: (transaction) =>
    set({ draft: { mode: 'edit', transaction }, returnFocus: activeElement() }),
  close: () => set({ draft: null }),
}))
