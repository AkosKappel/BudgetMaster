import { create } from 'zustand'

// Opened by Ctrl/Cmd+K and by the search buttons in the header and sidebar.
interface CommandPaletteState {
  open: boolean
  // Where focus goes back to on close; there is no Radix trigger to do it.
  returnFocus: HTMLElement | null
  setOpen: (open: boolean) => void
}

export const useCommandPalette = create<CommandPaletteState>()((set) => ({
  open: false,
  returnFocus: null,
  setOpen: (open) =>
    set(
      open
        ? {
            open,
            returnFocus:
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null,
          }
        : { open },
    ),
}))

// The keyboard shortcuts help, opened with ? or from the palette.
export const useShortcutsHelp = create<{
  open: boolean
  setOpen: (open: boolean) => void
}>()((set) => ({ open: false, setOpen: (open) => set({ open }) }))
