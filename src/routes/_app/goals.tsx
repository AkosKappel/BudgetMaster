import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, CircleCheck, Goal as GoalIcon, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { FormError } from '@/components/auth-page'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatShortDate } from '@/lib/format-date'
import { currencyDigits, formatMoney, parseAmount } from '@/lib/money'
import { goalsQuery, useActiveSpace, walletsQuery } from '@/lib/queries'
import { m } from '@/paraglide/messages.js'
import { deleteGoal, type Goal, type GoalInput, saveGoal } from '@/server/goals'

export const Route = createFileRoute('/_app/goals')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(goalsQuery(context.activeSpaceId)),
      context.queryClient.ensureQueryData(walletsQuery(context.activeSpaceId)),
    ]),
  head: () => ({ meta: [{ title: m.setup_goals_meta_title() }] }),
  component: Goals,
})

const selectClass =
  'h-9 w-full rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm'

type Editor = { mode: 'create' } | { mode: 'edit'; goal: Goal }
type GoalValues = Omit<GoalInput, 'spaceId' | 'id'>

function Goals() {
  const space = useActiveSpace()
  const { data } = useSuspenseQuery(goalsQuery(space.id))
  const queryClient = useQueryClient()
  const [editor, setEditor] = useState<Editor | null>(null)
  const editing = editor?.mode === 'edit' ? editor.goal : null

  const done = (message: string) => async () => {
    await queryClient.invalidateQueries({
      queryKey: goalsQuery(space.id).queryKey,
    })
    toast.success(message)
    setEditor(null)
  }
  const save = useMutation({
    mutationFn: (values: GoalValues) =>
      saveGoal({ data: { ...values, spaceId: space.id, id: editing?.id } }),
    onSuccess: done(
      editing ? m.setup_goals_updated() : m.setup_goals_created(),
    ),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteGoal({ data: { id, spaceId: space.id } }),
    onSuccess: done(m.setup_goals_deleted()),
    onError: (error) => toast.error(error.message),
  })

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/more"
        className="-ml-2 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {m.setup_back_more()}
      </Link>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.setup_goals_title()}
        </h1>
        {data.canWrite && (
          <Button onClick={() => setEditor({ mode: 'create' })}>
            <Plus />
            {m.setup_goals_new()}
          </Button>
        )}
      </div>
      <p className="max-w-prose text-muted-foreground">
        {m.setup_goals_intro()}
      </p>

      {data.goals.length === 0 ? (
        <EmptyState icon={GoalIcon}>{m.setup_goals_empty()}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.goals.map((goal) => (
            <li key={goal.id}>
              <GoalCard
                goal={goal}
                onEdit={
                  data.canWrite
                    ? () => setEditor({ mode: 'edit', goal })
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) {
            save.reset()
            setEditor(null)
          }
        }}
      >
        <DrawerContent>
          <div className="mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="px-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <DrawerTitle>
                {editing ? m.setup_goals_edit() : m.setup_goals_new()}
              </DrawerTitle>
              <DrawerDescription>
                {m.setup_goals_drawer_description()}
              </DrawerDescription>
            </DrawerHeader>
            {editor && (
              <GoalForm
                key={editing?.id ?? 'new'}
                spaceId={space.id}
                goal={editing}
                pending={save.isPending}
                error={save.error?.message}
                onSubmit={(values) => save.mutate(values)}
              />
            )}
            {editing && (
              <Button
                variant="ghost"
                className="mt-2 w-full text-destructive hover:text-destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(editing.id)}
              >
                {m.setup_goals_delete()}
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit?: () => void }) {
  const money = (minor: number) => formatMoney(minor, goal.currency)
  const status = goal.reached
    ? m.setup_goals_reached()
    : goal.perMonth !== null
      ? m.setup_goals_per_month({
          amount: money(goal.perMonth),
          date: formatShortDate(goal.targetDate ?? ''),
        })
      : goal.targetDate
        ? m.setup_goals_date_passed({ amount: money(goal.remaining) })
        : m.setup_goals_to_go({ amount: money(goal.remaining) })

  return (
    <article className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-medium">{goal.name}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {m.setup_goals_in_wallet({ wallet: goal.walletName })}
          </p>
        </div>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            aria-label={m.setup_edit_named({ name: goal.name })}
          >
            {m.setup_edit()}
          </Button>
        )}
      </div>
      <p className="text-sm">
        <span className="text-lg font-semibold">{money(goal.saved)}</span>{' '}
        <span className="text-muted-foreground">
          {m.setup_goals_of_target({
            target: money(goal.targetAmount),
            percent: goal.percent,
          })}
        </span>
      </p>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${goal.percent}%`, backgroundColor: goal.color }}
        />
      </div>
      <p className="flex items-center gap-1.5 text-sm">
        {goal.reached && (
          <CircleCheck className="size-4 text-income" aria-hidden="true" />
        )}
        {status}
      </p>
    </article>
  )
}

function GoalForm({
  spaceId,
  goal,
  pending,
  error,
  onSubmit,
}: {
  spaceId: string
  goal: Goal | null
  pending: boolean
  error?: string
  onSubmit: (values: GoalValues) => void
}) {
  const { data } = useSuspenseQuery(walletsQuery(spaceId))
  // Savings wallets first: the likely choice.
  const wallets = data.wallets
    .filter((w) => !w.archived || w.id === goal?.walletId)
    .toSorted(
      (a, b) => Number(b.type === 'savings') - Number(a.type === 'savings'),
    )
  const [name, setName] = useState(goal?.name ?? '')
  const [walletId, setWalletId] = useState(
    goal?.walletId ?? wallets[0]?.id ?? '',
  )
  const currency = wallets.find((w) => w.id === walletId)?.currency ?? 'EUR'
  const [amount, setAmount] = useState(
    goal ? String(goal.targetAmount / 10 ** currencyDigits(currency)) : '',
  )
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '')
  const [localError, setLocalError] = useState<string | null>(null)

  if (wallets.length === 0)
    return (
      <p className="pb-6 text-muted-foreground">{m.setup_goals_no_wallet()}</p>
    )

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        const targetAmount = parseAmount(amount, currencyDigits(currency))
        if (!name.trim()) return setLocalError(m.setup_enter_name())
        if (!targetAmount || targetAmount <= 0)
          return setLocalError(m.setup_goals_amount_invalid())
        setLocalError(null)
        onSubmit({
          name,
          walletId,
          targetAmount,
          targetDate: targetDate || null,
        })
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-name">{m.setup_form_name()}</Label>
        <Input
          id="goal-name"
          value={name}
          maxLength={60}
          required
          autoComplete="off"
          placeholder={m.setup_goals_name_placeholder()}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-wallet">{m.setup_goals_saved_in()}</Label>
        <select
          id="goal-wallet"
          className={selectClass}
          value={walletId}
          onChange={(e) => setWalletId(e.target.value)}
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.currency})
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-amount">
          {m.setup_goals_target({ currency })}
        </Label>
        <Input
          id="goal-amount"
          value={amount}
          inputMode="decimal"
          required
          autoComplete="off"
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-date">{m.setup_goals_reach_by()}</Label>
        <Input
          id="goal-date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>
      <FormError message={localError ?? error ?? null} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending
          ? m.setup_form_saving()
          : goal
            ? m.setup_form_save_changes()
            : m.setup_goals_create()}
      </Button>
    </form>
  )
}
