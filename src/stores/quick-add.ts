import { create } from 'zustand'

// The quick add sheet opens from the tab bar, the sidebar and (later) empty states.
interface QuickAddState {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useQuickAdd = create<QuickAddState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
