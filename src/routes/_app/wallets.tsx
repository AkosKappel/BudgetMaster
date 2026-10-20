import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowDown, ArrowUp, ChevronLeft, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  WALLET_TYPES,
  WalletForm,
  type WalletValues,
} from '@/components/wallet-form'
import { toCurrency } from '@/lib/currencies'
import { COLORS, iconFor } from '@/lib/icons'
import { formatMoney } from '@/lib/money'
import { useActiveSpace, walletsQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'
import {
  type ManagedWallet,
  reorderWallets,
  saveWallet,
  setWalletArchived,
} from '@/server/wallets'

export const Route = createFileRoute('/_app/wallets')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(walletsQuery(context.activeSpaceId)),
  head: () => ({ meta: [{ title: 'Wallets | BudgetMaster' }] }),
  component: Wallets,
})

type Editor = { mode: 'create' } | { mode: 'edit'; wallet: ManagedWallet }

function Wallets() {
  const space = useActiveSpace()
  const { data } = useSuspenseQuery(walletsQuery(space.id))
  const queryClient = useQueryClient()
  const [editor, setEditor] = useState<Editor | null>(null)

  const active = data.wallets.filter((w) => !w.archived)
  const archived = data.wallets.filter((w) => w.archived)
  const editing = editor?.mode === 'edit' ? editor.wallet : null

  // Wallets show up in balances, totals, pickers and every transaction row.
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['space', space.id] })

  const save = useMutation({
    mutationFn: (values: WalletValues) =>
      saveWallet({ data: { ...values, spaceId: space.id, id: editing?.id } }),
    onSuccess: async () => {
      await refresh()
      toast.success(editing ? 'Wallet updated' : 'Wallet created')
      setEditor(null)
    },
  })

  const archive = useMutation({
    mutationFn: (variables: { id: string; archived: boolean }) =>
      setWalletArchived({ data: { ...variables, spaceId: space.id } }),
    onSuccess: async (_result, { archived }) => {
      await refresh()
      toast.success(archived ? 'Wallet archived' : 'Wallet restored')
      setEditor(null)
    },
    onError: (error) => toast.error(error.message),
  })

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      reorderWallets({ data: { spaceId: space.id, ids } }),
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  })

  const move = (index: number, by: -1 | 1) => {
    const ids = active.map((w) => w.id)
    ;[ids[index], ids[index + by]] = [ids[index + by], ids[index]]
    reorder.mutate(ids)
  }

  const openEditor = (next: Editor | null) => {
    save.reset()
    setEditor(next)
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/more"
        className="-ml-2 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        More
      </Link>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-semibold text-2xl tracking-tight">Wallets</h1>
        {data.canWrite && (
          <Button onClick={() => openEditor({ mode: 'create' })}>
            <Plus />
            New wallet
          </Button>
        )}
      </div>
      <p className="max-w-prose text-muted-foreground">
        One wallet for each bank account, card or cash you track. Transfers
        between them are neither income nor expense.
      </p>

      {active.length > 0 && (
        <ul className="divide-y rounded-lg border bg-card">
          {active.map((w, index) => (
            <WalletRow
              key={w.id}
              wallet={w}
              onSelect={
                data.canWrite
                  ? () => openEditor({ mode: 'edit', wallet: w })
                  : undefined
              }
            >
              {data.canWrite && active.length > 1 && (
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Move ${w.name} up`}
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Move ${w.name} down`}
                    disabled={index === active.length - 1 || reorder.isPending}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                </div>
              )}
            </WalletRow>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details>
          <summary className="cursor-pointer font-semibold text-lg">
            Archived ({archived.length})
          </summary>
          <p className="my-3 max-w-prose text-muted-foreground text-sm">
            Left out of balances and pickers. Their transactions stay.
          </p>
          <ul className="divide-y rounded-lg border bg-card">
            {archived.map((w) => (
              <WalletRow key={w.id} wallet={w}>
                {data.canWrite && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={archive.isPending}
                    onClick={() =>
                      archive.mutate({ id: w.id, archived: false })
                    }
                  >
                    Restore
                  </Button>
                )}
              </WalletRow>
            ))}
          </ul>
        </details>
      )}

      <Drawer
        open={editor !== null}
        onOpenChange={(open) => !open && openEditor(null)}
      >
        <DrawerContent>
          <div className="mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="px-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <DrawerTitle>
                {editing ? 'Edit wallet' : 'New wallet'}
              </DrawerTitle>
              <DrawerDescription>
                {editing
                  ? WALLET_TYPES[editing.type].label
                  : 'A bank account, card, cash or savings.'}
              </DrawerDescription>
            </DrawerHeader>
            {editor && (
              <WalletForm
                key={editing?.id ?? 'new'}
                defaults={
                  editing
                    ? { ...editing, currency: toCurrency(editing.currency) }
                    : {
                        name: '',
                        type: 'checking',
                        currency: toCurrency(data.baseCurrency),
                        initialBalance: 0,
                        icon: WALLET_TYPES.checking.icon,
                        color: COLORS[15],
                      }
                }
                editing={editing !== null}
                currencyLocked={editing?.used ?? false}
                pending={save.isPending}
                error={save.error?.message}
                onSubmit={(values) => save.mutate(values)}
              />
            )}
            {editing && (
              <Button
                variant="ghost"
                className="mt-2 w-full text-destructive hover:text-destructive"
                disabled={archive.isPending}
                onClick={() =>
                  archive.mutate({ id: editing.id, archived: true })
                }
              >
                Archive
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function WalletRow({
  wallet,
  onSelect,
  children,
}: {
  wallet: ManagedWallet
  onSelect?: () => void
  children?: React.ReactNode
}) {
  const Icon = iconFor(wallet.icon)
  const content = (
    <>
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full"
        style={{
          color: wallet.color,
          backgroundColor: `color-mix(in oklab, ${wallet.color} 14%, transparent)`,
        }}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{wallet.name}</span>
        <span className="text-muted-foreground text-sm">
          {WALLET_TYPES[wallet.type].label}
        </span>
      </span>
      <span className="font-medium tabular-nums">
        {formatMoney(wallet.balance, wallet.currency)}
      </span>
    </>
  )
  const rowClass = 'flex w-full items-center gap-3 px-4 py-3 text-left'
  return (
    <li className="flex items-center">
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            rowClass,
            'outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          )}
        >
          {content}
        </button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
      {children && <div className="pr-4">{children}</div>}
    </li>
  )
}
