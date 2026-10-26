import { useDebouncer } from '@tanstack/react-pacer'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useId, useState } from 'react'

import { categoryOrder } from '@/components/transaction-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formOptionsQuery } from '@/lib/queries'
import {
  activeFilterCount,
  type TransactionFilters,
} from '@/lib/transaction-filters'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm'

const parseNumber = (value: string) =>
  value.trim() === '' || Number.isNaN(Number(value)) ? undefined : Number(value)

export function ActivityFilters({
  spaceId,
  filters,
  onClear,
}: {
  spaceId: string
  filters: TransactionFilters
  onClear: () => void
}) {
  const id = useId()
  const navigate = useNavigate({ from: '/activity' })
  const { data: options } = useQuery(formOptionsQuery(spaceId))
  const { q, ...panelFilters } = filters
  const panelCount = activeFilterCount(panelFilters)
  const [open, setOpen] = useState(panelCount > 0)

  const setFilter = <K extends keyof TransactionFilters>(
    key: K,
    value: TransactionFilters[K],
  ) =>
    navigate({
      search: (prev) => ({
        ...prev,
        [key]: value || value === 0 ? value : undefined,
      }),
      replace: true,
    })
  // Typed fields wait for a pause, so each keystroke is not a request.
  const debouncer = useDebouncer(setFilter, {
    wait: 300,
    key: 'activity-filters',
  })
  const setFilterLater = debouncer.maybeExecute

  const clearAll = () => {
    debouncer.cancel()
    onClear()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label={m.txn_filters_search()}
            placeholder={m.txn_filters_search()}
            defaultValue={q ?? ''}
            maxLength={60}
            onChange={(e) => setFilterLater('q', e.target.value.trim())}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen(!open)}
        >
          <SlidersHorizontal />
          {m.txn_filters()}
          {panelCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
              {panelCount}
            </span>
          )}
        </Button>
      </div>

      <fieldset
        id={`${id}-panel`}
        className={cn(
          'grid grid-cols-2 gap-3 rounded-lg border bg-card p-4',
          !open && 'hidden',
        )}
      >
        <legend className="sr-only">{m.txn_filters()}</legend>
        <Field label={m.txn_form_type()} htmlFor={`${id}-type`}>
          <select
            id={`${id}-type`}
            className={selectClass}
            value={filters.type ?? ''}
            onChange={(e) =>
              setFilter(
                'type',
                (e.target.value || undefined) as TransactionFilters['type'],
              )
            }
          >
            <option value="">{m.txn_filters_all()}</option>
            <option value="expense">{m.txn_type_expense()}</option>
            <option value="income">{m.txn_type_income()}</option>
            <option value="transfer">{m.txn_type_transfer()}</option>
          </select>
        </Field>
        <Field label={m.txn_form_category()} htmlFor={`${id}-category`}>
          <select
            id={`${id}-category`}
            className={selectClass}
            value={filters.category ?? ''}
            onChange={(e) => setFilter('category', e.target.value)}
          >
            <option value="">{m.txn_filters_all()}</option>
            {(['expense', 'income'] as const).map((type) => (
              <optgroup
                key={type}
                label={
                  type === 'expense'
                    ? m.txn_type_expense()
                    : m.txn_type_income()
                }
              >
                {categoryOrder(options?.categories ?? [], type).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? ` ${c.name}` : c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label={m.txn_form_wallet()} htmlFor={`${id}-wallet`}>
          <select
            id={`${id}-wallet`}
            className={selectClass}
            value={filters.wallet ?? ''}
            onChange={(e) => setFilter('wallet', e.target.value)}
          >
            <option value="">{m.txn_filters_all()}</option>
            {options?.wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={m.txn_filters_tag()} htmlFor={`${id}-tag`}>
          <select
            id={`${id}-tag`}
            className={selectClass}
            value={filters.tag ?? ''}
            onChange={(e) => setFilter('tag', e.target.value)}
          >
            <option value="">{m.txn_filters_all()}</option>
            {options?.tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={m.txn_filters_from()} htmlFor={`${id}-from`}>
          <Input
            id={`${id}-from`}
            type="date"
            value={filters.from ?? ''}
            max={filters.to}
            onChange={(e) => setFilter('from', e.target.value)}
          />
        </Field>
        <Field label={m.txn_filters_to()} htmlFor={`${id}-to`}>
          <Input
            id={`${id}-to`}
            type="date"
            value={filters.to ?? ''}
            min={filters.from}
            onChange={(e) => setFilter('to', e.target.value)}
          />
        </Field>
        <Field label={m.txn_filters_min()} htmlFor={`${id}-min`}>
          <Input
            id={`${id}-min`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={filters.min}
            onChange={(e) => setFilterLater('min', parseNumber(e.target.value))}
          />
        </Field>
        <Field label={m.txn_filters_max()} htmlFor={`${id}-max`}>
          <Input
            id={`${id}-max`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={filters.max}
            onChange={(e) => setFilterLater('max', parseNumber(e.target.value))}
          />
        </Field>
        <div className="col-span-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={activeFilterCount(filters) === 0}
          >
            {m.txn_filters_clear_all()}
          </Button>
        </div>
      </fieldset>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
