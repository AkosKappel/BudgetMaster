import { formatForDisplay, useHotkey } from '@tanstack/react-hotkeys'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftRight,
  ChartColumn,
  Check,
  Ellipsis,
  FileText,
  FileUp,
  Gauge,
  Goal,
  House,
  Keyboard,
  LogOut,
  Minus,
  Plus,
  ReceiptText,
  Repeat,
  Search,
  Settings,
  Settings2,
  Shapes,
  Sparkles,
  Tag,
  User,
  Users,
  WalletCards,
  Wand,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { useSignOut } from '@/components/auth-page'
import { THEME_OPTIONS } from '@/components/theme-switch'
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
import { useIsClient } from '@/hooks/use-is-client'
import { formatShortDate } from '@/lib/format-date'
import { iconFor } from '@/lib/icons'
import { formatSignedMoney } from '@/lib/money'
import {
  formOptionsQuery,
  searchQuery,
  useActiveSpace,
  useCanWrite,
  useSpaces,
  useSwitchSpace,
} from '@/lib/queries'
import { setTheme, THEMES, useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { useCommandPalette, useShortcutsHelp } from '@/stores/command-palette'
import { useQuickAdd } from '@/stores/quick-add'

const PALETTE_HOTKEY = 'Mod+K'
const QUICK_ADD_HOTKEY = 'N'
const HELP_HOTKEY = 'Shift+/'

// Shown in the shortcuts help; the sidebar toggle lives in app-nav.
export const SHORTCUTS = [
  { keys: PALETTE_HOTKEY, action: m.shell_shortcut_palette },
  { keys: QUICK_ADD_HOTKEY, action: m.shell_shortcut_add },
  { keys: 'Mod+B', action: m.shell_shortcut_sidebar },
  { keys: HELP_HOTKEY, action: m.shell_shortcut_help },
  { keys: 'Escape', action: m.shell_shortcut_close },
] as const

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
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebouncedValue(query.trim(), {
    wait: 200,
    // Names it in the Pacer devtools panel.
    key: 'palette-search',
  })
  // Prefetched by the app layout; only listed once something is typed.
  const { data: options } = useQuery({
    ...formOptionsQuery(space.id),
    enabled: open,
  })
  const filterActivity = (search: {
    category?: string
    wallet?: string
    tag?: string
  }) => run(() => navigate({ to: '/activity', search }))
  const { data: results = [], isFetching } = useQuery({
    ...searchQuery(space.id, debouncedQuery),
    enabled: open && debouncedQuery.length >= 2,
    placeholderData: keepPreviousData,
  })

  useHotkey(PALETTE_HOTKEY, () => setOpen(!open))
  const setShortcutsOpen = useShortcutsHelp((s) => s.setOpen)
  useHotkey(HELP_HOTKEY, () => setShortcutsOpen(true), { enabled: !open })
  // Single keys are ignored while typing in a field.
  const canWrite = useCanWrite()
  useHotkey(QUICK_ADD_HOTKEY, () => openNew(), { enabled: !open && canWrite })

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
      title={m.shell_shortcut_palette()}
      description={m.shell_palette_description()}
      className="max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0"
    >
      <CommandInput
        placeholder={m.shell_palette_placeholder()}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-sm:max-h-[calc(100dvh-3rem)]">
        <CommandEmpty>
          {isFetching ? m.shell_palette_searching() : m.shell_palette_empty()}
        </CommandEmpty>

        {debouncedQuery.length >= 2 && results.length > 0 && (
          <CommandGroup
            heading={m.shell_palette_transactions_in({ space: space.name })}
          >
            {results.map((t) => {
              const Icon =
                t.type === 'transfer'
                  ? ArrowLeftRight
                  : iconFor(t.category?.icon)
              const title =
                t.payee ?? t.category?.name ?? m.shell_palette_transfer()
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

        {query.trim() && options && (
          <CommandGroup heading={m.shell_palette_show_in_activity()}>
            {options.categories.map((c) => {
              const Icon = iconFor(c.icon)
              return (
                <CommandItem
                  key={c.id}
                  value={`category ${c.name} ${c.id}`}
                  onSelect={filterActivity({ category: c.id })}
                >
                  <Icon style={{ color: c.color }} />
                  {c.name}
                  <span className="ml-auto text-muted-foreground text-xs">
                    {c.type === 'income'
                      ? m.shell_palette_income_category()
                      : m.shell_palette_category()}
                  </span>
                </CommandItem>
              )
            })}
            {options.wallets.map((w) => {
              const Icon = iconFor(w.icon)
              return (
                <CommandItem
                  key={w.id}
                  value={`wallet ${w.name} ${w.id}`}
                  onSelect={filterActivity({ wallet: w.id })}
                >
                  <Icon style={{ color: w.color }} />
                  {w.name}
                  <span className="ml-auto text-muted-foreground text-xs">
                    {m.shell_palette_wallet()}
                  </span>
                </CommandItem>
              )
            })}
            {options.tags.map((t) => (
              <CommandItem
                key={t.id}
                value={`tag ${t.name} ${t.id}`}
                onSelect={filterActivity({ tag: t.id })}
              >
                <Tag style={{ color: t.color }} />
                {t.name}
                <span className="ml-auto text-muted-foreground text-xs">
                  {m.shell_palette_tag()}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {canWrite && (
          <CommandGroup heading={m.shell_palette_add()}>
            <CommandItem onSelect={run(() => openNew('expense'))}>
              <Minus />
              {m.shell_palette_add_expense()}
              <HotkeyHint hotkey={QUICK_ADD_HOTKEY} />
            </CommandItem>
            <CommandItem onSelect={run(() => openNew('income'))}>
              <Plus />
              {m.shell_palette_add_income()}
            </CommandItem>
            <CommandItem onSelect={run(() => openNew('transfer'))}>
              <ArrowLeftRight />
              {m.shell_palette_add_transfer()}
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading={m.shell_palette_go_to()}>
          {(
            [
              { to: '/', label: m.shell_nav_home(), icon: House },
              {
                to: '/activity',
                label: m.shell_nav_activity(),
                icon: ReceiptText,
              },
              { to: '/budgets', label: m.shell_nav_budgets(), icon: Gauge },
              { to: '/more', label: m.shell_nav_more(), icon: Ellipsis },
            ] as const
          ).map(({ to, label, icon: Icon }) => (
            <CommandItem
              key={to}
              value={`${m.shell_palette_go_to()} ${label}`}
              onSelect={run(() => navigate({ to }))}
            >
              <Icon />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        {spaces.length > 1 && (
          <CommandGroup heading={m.shell_palette_switch_space()}>
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

        <CommandGroup heading={m.shell_palette_spaces()}>
          <CommandItem onSelect={run(() => navigate({ to: '/spaces' }))}>
            <Settings2 />
            {m.shell_palette_manage_spaces()}
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/import' }))}>
            <FileUp />
            {m.shell_palette_import()}
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/reports' }))}>
            <ChartColumn />
            {m.shell_palette_reports()}
          </CommandItem>
          <CommandItem
            onSelect={run(() => navigate({ to: '/monthly-report' }))}
          >
            <FileText />
            {m.shell_palette_monthly_report()}
          </CommandItem>
          <CommandItem
            onSelect={run(() => navigate({ to: '/year-in-review' }))}
          >
            <Sparkles />
            {m.shell_palette_year_in_review()}
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/goals' }))}>
            <Goal />
            {m.shell_palette_goals()}
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/recurring' }))}>
            <Repeat />
            {m.shell_palette_recurring()}
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/wallets' }))}>
            <WalletCards />
            {m.shell_palette_wallets()}
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/rules' }))}>
            <Wand />
            {m.shell_palette_rules()}
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/tags' }))}>
            <Tag />
            {m.shell_palette_tags()}
          </CommandItem>
          <CommandItem onSelect={run(() => navigate({ to: '/categories' }))}>
            <Shapes />
            {m.shell_palette_categories()}
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading={m.shell_theme_title()}>
          {THEMES.map((value) => {
            const { label, icon: Icon } = THEME_OPTIONS[value]
            return (
              <CommandItem
                key={value}
                value={`${m.shell_theme_title()} ${label()} ${m.shell_theme_appearance()}`}
                onSelect={run(() => setTheme(value))}
              >
                <Icon />
                {m.shell_palette_theme_item({ theme: label() })}
                {theme === value && <Check className="ml-auto" />}
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandGroup heading={m.shell_palette_account()}>
          <CommandItem onSelect={run(() => navigate({ to: '/settings' }))}>
            <Settings />
            {m.shell_nav_settings()}
          </CommandItem>
          <CommandItem onSelect={run(() => setShortcutsOpen(true))}>
            <Keyboard />
            {m.shell_shortcuts_title()}
          </CommandItem>
          <CommandItem onSelect={run(() => signOut())}>
            <LogOut />
            {m.shell_nav_sign_out()}
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
        aria-label={m.shell_palette_search()}
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
      {m.shell_palette_search()}
      {isClient && (
        <kbd className="ml-auto rounded-sm border bg-muted px-1.5 font-sans text-xs">
          {formatForDisplay(PALETTE_HOTKEY)}
        </kbd>
      )}
    </Button>
  )
}
