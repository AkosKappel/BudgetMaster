import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Gauge, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { FormError } from '@/components/auth-page'
import { BudgetMeter } from '@/components/budget-meter'
import { EmptyState } from '@/components/empty-state'
import { SpendingBreakdown } from '@/components/spending-breakdown'
import { SpendingPaceChart } from '@/components/spending-pace-chart'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { formatShortDate } from '@/lib/format-date'
import { iconFor } from '@/lib/icons'
import { currencyDigits, formatMoney, parseAmount } from '@/lib/money'
import { budgetReportQuery, useActiveSpace } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { type BudgetReport, deleteBudget, setBudget } from '@/server/budgets'

export const Route = createFileRoute('/_app/budgets')({
  // `?month=-1` is the previous budget month.
  validateSearch: z.object({
    month: z.int().min(-36).max(0).catch(0).default(0),
  }),
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      budgetReportQuery(context.activeSpaceId, deps.month),
    ),
  head: () => ({ meta: [{ title: 'Budgets | BudgetMaster' }] }),
  component: Budgets,
})

// What the budget sheet edits: an existing budget, or a new one for a chosen category.
type Editing =
  | {
      mode: 'edit'
      categoryId: string | null
      name: string
      amount: number
      rollover: boolean
    }
  | { mode: 'new' }

function Budgets() {
  const { month } = Route.useSearch()
  const space = useActiveSpace()
  // Keeps the previous month on screen while the next one loads: no flash.
  const { data, isPlaceholderData } = useQuery({
    ...budgetReportQuery(space.id, month),
    placeholderData: keepPreviousData,
  })
  const [editing, setEditing] = useState<Editing | null>(null)
  if (!data) return null

  const money = (minor: number) => formatMoney(minor, data.currency)
  const periodLabel = `${formatShortDate(data.period.start)} – ${formatShortDate(data.period.end)}`

  return (
    <div
      className={cn(
        'flex flex-col gap-8 transition-opacity',
        isPlaceholderData && 'opacity-60',
      )}
    >
      <div className="flex flex-col gap-3">
        <h1 className="font-semibold text-2xl tracking-tight">Budgets</h1>
        <nav aria-label="Budget month" className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link
              to="/budgets"
              search={{ month: month - 1 }}
              aria-label="Previous month"
            >
              <ChevronLeft />
            </Link>
          </Button>
          <p
            className="min-w-0 flex-1 text-center font-medium"
            aria-live="polite"
          >
            {data.isCurrent ? 'This month, ' : ''}
            {periodLabel}
          </p>
          <Button
            variant="ghost"
            size="icon"
            asChild={month < 0}
            disabled={month >= 0}
            aria-label="Next month"
          >
            {month < 0 ? (
              <Link to="/budgets" search={{ month: month + 1 }}>
                <ChevronRight />
              </Link>
            ) : (
              <ChevronRight />
            )}
          </Button>
        </nav>
      </div>

      <section
        aria-labelledby="overall"
        className="flex flex-col gap-3 rounded-xl border bg-card p-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="overall" className="text-muted-foreground text-sm">
            All spending
          </h2>
          {data.canWrite && (
            <Button
              variant="ghost"
              size="sm"
              className="-my-2"
              onClick={() =>
                setEditing({
                  mode: 'edit',
                  categoryId: null,
                  name: 'All spending',
                  amount: data.overall?.amount ?? 0,
                  rollover: false,
                })
              }
            >
              {data.overall ? 'Edit' : 'Set a limit'}
            </Button>
          )}
        </div>
        <p className="font-semibold text-4xl tracking-tight">
          {money(data.spent)}
        </p>
        {data.overall ? (
          <BudgetMeter
            spent={data.spent}
            limit={data.overall.amount}
            currency={data.currency}
            daysLeft={data.isCurrent ? data.daysLeft : undefined}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            No overall limit. Set one to see how much is left each day.
          </p>
        )}
      </section>

      <section aria-labelledby="pace" className="flex flex-col gap-3">
        <h2 id="pace" className="font-semibold text-lg">
          Spending pace
        </h2>
        <SpendingPaceChart
          pace={data.pace}
          budget={data.overall?.amount ?? null}
          currency={data.currency}
          isCurrent={data.isCurrent}
        />
      </section>

      <section
        aria-labelledby="category-budgets"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="category-budgets" className="font-semibold text-lg">
            Category budgets
          </h2>
          {data.canWrite && data.unbudgeted.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing({ mode: 'new' })}
            >
              <Plus />
              Add budget
            </Button>
          )}
        </div>
        {data.categoryBudgets.length === 0 ? (
          <EmptyState icon={Gauge}>
            Give a category a monthly limit, like 400 for groceries, to see how
            much is left before you go over.
          </EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {data.categoryBudgets.map((b) => {
              const Icon = iconFor(b.icon)
              const body = (
                <>
                  <span className="flex items-center gap-2">
                    <Icon
                      className="size-4 shrink-0"
                      style={{ color: b.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {b.name}
                    </span>
                    {b.isParent && (
                      <span className="text-muted-foreground text-xs">
                        incl. subcategories
                      </span>
                    )}
                    <span className="text-sm">{money(b.spent)}</span>
                  </span>
                  <BudgetMeter
                    spent={b.spent}
                    limit={b.amount}
                    currency={data.currency}
                    daysLeft={data.isCurrent ? data.daysLeft : undefined}
                  />
                  {b.carried > 0 && (
                    <span className="text-muted-foreground text-xs">
                      Includes {money(b.carried)} left over from last month
                    </span>
                  )}
                </>
              )
              return (
                <li key={b.id}>
                  {data.canWrite ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          mode: 'edit',
                          categoryId: b.categoryId,
                          name: b.name,
                          amount: b.monthlyAmount,
                          rollover: b.rollover,
                        })
                      }
                      className="flex w-full flex-col gap-2 px-4 py-3 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      {body}
                      {/* Keeps the visible text first in the name (WCAG 2.5.3). */}
                      <span className="sr-only">Edit budget</span>
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 px-4 py-3">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="breakdown" className="flex flex-col gap-3">
        <h2 id="breakdown" className="font-semibold text-lg">
          Where it went
        </h2>
        <SpendingBreakdown
          breakdown={data.breakdown}
          total={data.spent}
          currency={data.currency}
        />
      </section>

      <BudgetSheet
        editing={editing}
        report={data}
        spaceId={space.id}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

function BudgetSheet({
  editing,
  report,
  spaceId,
  onClose,
}: {
  editing: Editing | null
  report: BudgetReport
  spaceId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['space', spaceId, 'budgets'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['space', spaceId, 'overview'],
      }),
    ])
  const save = useMutation({
    mutationFn: setBudget,
    onSuccess: async () => {
      await refresh()
      toast.success('Budget saved')
      onClose()
    },
    onError: (e) => setError(e.message),
  })
  const remove = useMutation({
    mutationFn: deleteBudget,
    onSuccess: async () => {
      await refresh()
      toast.success('Budget removed')
      onClose()
    },
    onError: (e) => setError(e.message),
  })
  const digits = currencyDigits(report.currency)
  const isEdit = editing?.mode === 'edit'
  const hasBudget =
    isEdit &&
    (editing.categoryId === null
      ? report.overall !== null
      : report.categoryBudgets.some((b) => b.categoryId === editing.categoryId))
  const parents = report.unbudgeted.filter((c) => !c.parentId)

  return (
    <Drawer
      open={editing !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null)
          onClose()
        }
      }}
    >
      <DrawerContent>
        <form
          className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)
            const form = new FormData(event.currentTarget)
            const amount = parseAmount(String(form.get('amount')), digits)
            if (!amount) {
              setError('Enter a monthly limit.')
              return
            }
            const categoryId = isEdit
              ? editing.categoryId
              : String(form.get('category'))
            save.mutate({
              data: {
                spaceId,
                categoryId: categoryId || null,
                amount,
                rollover: form.get('rollover') === 'on',
              },
            })
          }}
        >
          <DrawerHeader className="px-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle>{isEdit ? editing.name : 'New budget'}</DrawerTitle>
            <DrawerDescription>
              A monthly limit in {report.currency}. A group's limit includes its
              subcategories.
            </DrawerDescription>
          </DrawerHeader>
          {!isEdit && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="budget-category">Category</Label>
              <select
                id="budget-category"
                name="category"
                className="h-10 rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
              >
                {parents.flatMap((p) => [
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>,
                  ...report.unbudgeted
                    .filter((c) => c.parentId === p.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {`  ${c.name}`}
                      </option>
                    )),
                ])}
                {report.unbudgeted
                  .filter(
                    (c) =>
                      c.parentId && !parents.some((p) => p.id === c.parentId),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-amount">Monthly limit</Label>
            <div className="flex items-baseline gap-2 border-input border-b-2 pb-1 focus-within:border-ring">
              <span className="text-muted-foreground text-xl">
                {report.currency}
              </span>
              <input
                id="budget-amount"
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={
                  isEdit && editing.amount
                    ? (editing.amount / 10 ** digits).toFixed(digits)
                    : ''
                }
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent font-semibold text-3xl outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          {!(isEdit && editing.categoryId === null) && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="rollover"
                defaultChecked={isEdit && editing.rollover}
                className="mt-0.5"
              />
              <span>
                Carry over what is left
                <span className="block text-muted-foreground">
                  Money not spent this month is added to next month's limit.
                </span>
              </span>
            </label>
          )}
          <FormError message={error} />
          <div className="flex gap-2">
            {hasBudget && (
              <Button
                type="button"
                variant="outline"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate({
                    data: { spaceId, categoryId: editing.categoryId },
                  })
                }
              >
                Remove limit
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={save.isPending}>
              Save budget
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
