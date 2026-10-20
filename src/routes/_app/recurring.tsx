import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, Plus, Repeat, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/empty-state'
import { RecurringForm, type RuleValues } from '@/components/recurring-form'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { formatShortDate } from '@/lib/format-date'
import { iconFor } from '@/lib/icons'
import { formatMoney, formatSignedMoney } from '@/lib/money'
import { formOptionsQuery, recurringQuery, useActiveSpace } from '@/lib/queries'
import { describeSchedule } from '@/lib/recurrence'
import { currentDay } from '@/lib/today'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import {
  deleteRecurringRule,
  type RecurringRule,
  saveRecurringRule,
  setRecurringRulePaused,
} from '@/server/recurring'

export const Route = createFileRoute('/_app/recurring')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        recurringQuery(context.activeSpaceId),
      ),
      context.queryClient.ensureQueryData(
        formOptionsQuery(context.activeSpaceId),
      ),
    ]),
  head: () => ({ meta: [{ title: m.setup_recurring_meta_title() }] }),
  component: Recurring,
})

type Editor =
  | { mode: 'create'; draft?: Partial<RuleValues> }
  | { mode: 'edit'; rule: RecurringRule }

const CADENCE_LABEL = {
  weekly: m.setup_recurring_cadence_weekly,
  monthly: m.setup_recurring_cadence_monthly,
  yearly: m.setup_recurring_cadence_yearly,
}

function Recurring() {
  const space = useActiveSpace()
  const { data } = useSuspenseQuery(recurringQuery(space.id))
  const { data: options } = useSuspenseQuery(formOptionsQuery(space.id))
  const queryClient = useQueryClient()
  const [editor, setEditor] = useState<Editor | null>(null)
  const editing = editor?.mode === 'edit' ? editor.rule : null
  const draft = editor?.mode === 'create' ? editor.draft : undefined
  const today = currentDay()

  // New payments show up in balances, budgets and activity.
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['space', space.id] })
  const done = (message: string) => async () => {
    await refresh()
    toast.success(message)
    setEditor(null)
  }

  const save = useMutation({
    mutationFn: (values: RuleValues) =>
      saveRecurringRule({
        data: { ...values, spaceId: space.id, id: editing?.id },
      }),
    onSuccess: done(
      editing ? m.setup_recurring_updated() : m.setup_recurring_created(),
    ),
  })
  const pause = useMutation({
    mutationFn: (variables: { id: string; paused: boolean }) =>
      setRecurringRulePaused({ data: { ...variables, spaceId: space.id } }),
    onSuccess: (_result, { paused }) =>
      done(paused ? m.setup_recurring_paused() : m.setup_recurring_resumed())(),
    onError: (error) => toast.error(error.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) =>
      deleteRecurringRule({ data: { id, spaceId: space.id } }),
    onSuccess: done(m.setup_recurring_deleted()),
    onError: (error) => toast.error(error.message),
  })

  const label = (rule: RecurringRule) => {
    if (rule.payee) return rule.payee
    if (rule.type === 'transfer') return m.setup_type_transfer()
    return (
      options.categories.find((c) => c.id === rule.categoryId)?.name ??
      m.setup_recurring_payment()
    )
  }
  const currencyOf = (walletId: string) =>
    options.wallets.find((w) => w.id === walletId)?.currency ??
    space.baseCurrency

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/more"
        className="-ml-2 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {m.setup_back_more()}
      </Link>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-semibold text-2xl tracking-tight">
          {m.setup_recurring_title()}
        </h1>
        {data.canWrite && (
          <Button onClick={() => setEditor({ mode: 'create' })}>
            <Plus />
            {m.setup_recurring_new_short()}
          </Button>
        )}
      </div>
      <p className="max-w-prose text-muted-foreground">
        {m.setup_recurring_intro()}
      </p>

      {data.yearlyExpenses > 0 && (
        <p className="text-sm">
          {m.setup_recurring_yearly_before()}{' '}
          <span className="font-medium">
            {m.setup_recurring_per_year({
              amount: formatMoney(data.yearlyExpenses, data.currency),
            })}
          </span>{' '}
          {m.setup_recurring_yearly_after({
            amount: formatMoney(
              Math.round(data.yearlyExpenses / 12),
              data.currency,
            ),
          })}
        </p>
      )}

      {data.rules.length === 0 ? (
        <EmptyState icon={Repeat}>{m.setup_recurring_empty()}</EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {data.rules.map((rule) => {
            const category = options.categories.find(
              (c) => c.id === rule.categoryId,
            )
            const Icon =
              rule.type === 'transfer' ? Repeat : iconFor(category?.icon)
            const color = category?.color ?? 'var(--muted-foreground)'
            const currency = currencyOf(rule.walletId)
            const status = rule.paused
              ? m.setup_recurring_status_paused()
              : rule.nextDate
                ? m.setup_recurring_status_next({
                    date: formatShortDate(rule.nextDate),
                  })
                : m.setup_recurring_status_ended()
            const content = (
              <>
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    color,
                    backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
                  }}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{label(rule)}</span>
                  <span className="truncate text-muted-foreground text-sm">
                    {describeSchedule(rule)} · {status}
                  </span>
                </span>
                <span className="font-medium tabular-nums">
                  {rule.type === 'transfer'
                    ? formatMoney(rule.amount, currency)
                    : formatSignedMoney(
                        rule.type === 'income' ? rule.amount : -rule.amount,
                        currency,
                      )}
                </span>
              </>
            )
            // Paused and ended rules say so in the text; dimming them failed contrast.
            const rowClass =
              'flex w-full items-center gap-3 px-4 py-3 text-left'
            return (
              <li key={rule.id}>
                {data.canWrite ? (
                  <button
                    type="button"
                    className={cn(
                      rowClass,
                      'outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    )}
                    onClick={() => setEditor({ mode: 'edit', rule })}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={rowClass}>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {data.canWrite && data.suggestions.length > 0 && (
        <section aria-labelledby="suggestions" className="flex flex-col gap-3">
          <h2
            id="suggestions"
            className="flex items-center gap-2 font-semibold text-lg"
          >
            <Sparkles className="size-4 text-note" aria-hidden="true" />
            {m.setup_recurring_suggestions_title()}
          </h2>
          <p className="max-w-prose text-muted-foreground text-sm">
            {m.setup_recurring_suggestions_intro()}
          </p>
          <ul className="divide-y rounded-lg border bg-card">
            {data.suggestions.map((s) => {
              const currency = currencyOf(s.walletId)
              return (
                <li
                  key={`${s.walletId}-${s.payee}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{s.payee}</span>
                    <span className="text-muted-foreground text-sm">
                      {m.setup_recurring_suggestion_detail({
                        cadence: CADENCE_LABEL[s.cadence](),
                        count: s.count,
                        date: formatShortDate(s.lastDate),
                      })}{' '}
                      ·{' '}
                      {m.setup_recurring_per_year({
                        amount: formatMoney(s.yearlyCost, currency),
                      })}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatSignedMoney(-s.amount, currency)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={m.setup_recurring_make_recurring_label({
                      payee: s.payee,
                    })}
                    onClick={() =>
                      setEditor({
                        mode: 'create',
                        draft: {
                          type: 'expense',
                          walletId: s.walletId,
                          categoryId: s.categoryId,
                          amount: s.amount,
                          payee: s.payee,
                          frequency: s.cadence,
                          interval: 1,
                          startDate: s.nextDate,
                        },
                      })
                    }
                  >
                    {m.setup_recurring_make_recurring()}
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
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
                {editing ? m.setup_recurring_edit() : m.setup_recurring_new()}
              </DrawerTitle>
              <DrawerDescription>
                {editing
                  ? m.setup_recurring_edit_description()
                  : m.setup_recurring_new_description()}
              </DrawerDescription>
            </DrawerHeader>
            {editor && (
              <RecurringForm
                key={editing?.id ?? draft?.payee ?? 'new'}
                spaceId={space.id}
                rule={editing ?? undefined}
                draft={draft}
                today={today}
                pending={save.isPending}
                error={save.error?.message}
                onSubmit={(values) => save.mutate(values)}
              />
            )}
            {editing && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {editing.nextDate && (
                  <Button
                    variant="outline"
                    disabled={pause.isPending}
                    onClick={() =>
                      pause.mutate({ id: editing.id, paused: !editing.paused })
                    }
                  >
                    {editing.paused
                      ? m.setup_recurring_resume()
                      : m.setup_recurring_pause()}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(editing.id)}
                >
                  {m.setup_delete()}
                </Button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
