import { formatForDisplay, useHotkey } from '@tanstack/react-hotkeys'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftRight,
  ChartColumn,
  Check,
  Ellipsis,
  FileUp,
  Gauge,
  House,
  LogOut,
  Minus,
  Plus,
  ReceiptText,
  Repeat,
  Search,
  Settings2,
  Shapes,
  Tag,
  User,
  Users,
  WalletCards,
} from 'lucide-react'
import { useRef, useState, useSyncExternalStore } from 'react'

import { useSignOut } from '@/components/auth-page'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { formatShortDate } from '@/lib/format-date'
import { iconFor } from '@/lib/icons'
import { formatSignedMoney } from '@/lib/money'
import {
  searchQuery,
  useActiveSpace,
  useSpaces,
  useSwitchSpace,
} from '@/lib/queries'
import { cn } from '@/lib/utils'
import { useCommandPalette } from '@/stores/command-palette'
import { useQuickAdd } from '@/stores/quick-add'

const PALETTE_HOTKEY = 'Mod+K'
const QUICK_ADD_HOTKEY = 'N'

// The platform (Ctrl or ⌘) is only known in the browser, so the hint renders after hydration.
const useIsClient = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

export function CommandPalette() {
  const { open, setOpen, returnFocus } = useCommandPalette()
  const actionRan = useRef(false)
  const openNew = useQuickAdd((s) => s.openNew)
  const navigate = useNavigate()
  const signOut = useSignOut()
  const space = useActiveSpace()
  const { spaces } = useSpaces()
  const { switchTo } = useSwitchSpace()
  const openEdit = useQuickAdd((s) => s.openEdit)
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebouncedValue(query.trim(), { wait: 200 })
  const { data: results = [], isFetching } = useQuery({
    ...searchQuery(space.id, debouncedQuery),
    enabled: open && debouncedQuery.length >= 2,
    placeholderData: keepPreviousData,
  })

  useHotkey(PALETTE_HOTKEY, () => setOpen(!open))
  // Single keys are ignored while typing in a field.
  useHotkey(QUICK_ADD_HOTKEY, () => openNew(), { enabled: !open })

  // Closes the palette first, so the next sheet or page gets focus.
  const run = (action: () => void) => () => {
    actionRan.current = true
    setOpen(false)
    setQuery('')
    action()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
      onCloseAutoFocus={(event) => {
        // After an action the next sheet or page owns focus; otherwise go back to the opener.
        event.preventDefault()
        if (!actionRan.current && returnFocus?.isConnected) returnFocus.focus()
        actionRan.current = false
      }}
      title="Search and commands"
      description="Find transactions, go to a page or run an action."
      className="max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0"
    >
      <CommandInput
        placeholder="Search transactions or type a command"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-sm:max-h-[calc(100dvh-3rem)]">
        <CommandEmpty>
          {isFetching ? 'Searching' : 'Nothing found. Try a payee or a note.'}
        </CommandEmpty>

        {debouncedQuery.length >= 2 && results.length > 0 && (
          <CommandGroup heading={`Transactions in ${space.name}`}>
            {results.map((t) => {
              const Icon =
                t.type === 'transfer'
                  ? ArrowLeftRight
                  : iconFor(t.category?.icon)
              const title = t.payee ?? t.category?.name ?? 'Transfer'
              return (
                <CommandItem
                  key={t.id}
                  // cmdk filters by value: include what the server matched on.
                  value={`${title} ${t.note ?? ''} ${t.id}`}
                  onSelect={run(() => openEdit(t))}
                >
                  <Icon style={{ color: t.category?.color }} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{title}</span>
                    <span className="truncate text-muted-foreground text-xs">
                      {formatShortDate(t.date)}
                      {t.note ? `, ${t.note}` : ''}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-sm',
                      t.type === 'income' && 'text-income',
                    )}
                  >
                    {formatSignedMoney(
                      t.type === 'expense' ? -t.amount : t.amount,
                      t.wallet.currency,
                    )}
                  </span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="Add">
          <CommandItem onSelect={run(() => openNew('expense'))}>
            <Minus />
            Add expense
            <HotkeyHint hotkey={QUICK_ADD_HOTKEY} />
          </CommandItem>
          <CommandItem onSelect={run(() => openNew('income'))}>
            <Plus />
            Add income
          </CommandItem>
          <CommandItem onSelect={run(() => openNew('transfer'))}>
            <ArrowLeftRight />
            Add transfer
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Go to">
          {(
            [
              { to: '/', label: 'Home', icon: House },
              { to: '/activity', label: 'Activity', icon: ReceiptText },
              { to: '/budgets', label: 'Budgets', icon: Gauge },
              { to: '/more', label: 'More', icon: Ellipsis },
            ] as const
          ).map(({ to, label, icon: Icon }) => (
            <CommandItem
              key={to}
              value={`Go to ${label}`}
              onSelect={run(() => navigate({ to }))}
            >
              <Icon />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        {spaces.length > 1 && (
          <CommandGroup heading="Switch space">
            {spaces.map((s) => {
              const Icon = s.personal ? User : Users
              return (
                <CommandItem
                  key={s.id}
                  value={`Switch to ${s.name} ${s.id}`}
                  onSelect={run(() => s.id !== space.id && switchTo(s.id))}
                >
                  <Icon />
                  {s.name}
                  {s.id === space.id && <Check className="ml-auto" />}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="Spaces">
          <CommandItem onSelect={run(() => navigate({ to: '/spaces' }))}>
            <Settings2 />
            Manage spaces and invites
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/import' }))}>
            <FileUp />
            Import a bank CSV
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/reports' }))}>
            <ChartColumn />
            Reports
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/recurring' }))}>
            <Repeat />
            Recurring payments
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/wallets' }))}>
            <WalletCards />
            Manage wallets
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/tags' }))}>
            <Tag />
            Manage tags
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/categories' }))}>
            <Shapes />
            Manage categories
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Account">
          <CommandItem onSelect={run(() => signOut())}>
            <LogOut />
            Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

function HotkeyHint({ hotkey }: { hotkey: string }) {
  const isClient = useIsClient()
  if (!isClient) return null
  return <CommandShortcut>{formatForDisplay(hotkey)}</CommandShortcut>
}

// Search button for the header and sidebar.
export function SearchButton({
  className,
  compact,
}: {
  className?: string
  compact?: boolean
}) {
  const setOpen = useCommandPalette((s) => s.setOpen)
  const isClient = useIsClient()

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-10', className)}
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-5" />
      </Button>
    )
  }
  return (
    <Button
      variant="outline"
      className={cn('justify-start gap-2 text-muted-foreground', className)}
      onClick={() => setOpen(true)}
    >
      <Search />
      Search
      {isClient && (
        <kbd className="ml-auto rounded-sm border bg-muted px-1.5 font-sans text-xs">
          {formatForDisplay(PALETTE_HOTKEY)}
        </kbd>
      )}
    </Button>
  )
}
