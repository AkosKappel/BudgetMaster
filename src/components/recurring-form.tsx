import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { FormError } from '@/components/auth-page'
import { categoryOrder } from '@/components/transaction-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { currencyDigits, parseAmount } from '@/lib/money'
import { formOptionsQuery } from '@/lib/queries'
import { describeSchedule } from '@/lib/recurrence'
import { m } from '@/paraglide/messages.js'
import type { RecurringRule, RecurringRuleInput } from '@/server/recurring'

export type RuleValues = Omit<RecurringRuleInput, 'spaceId' | 'id'>
type RuleType = RuleValues['type']
type Frequency = RuleValues['frequency']

const selectClass =
  'h-9 w-full rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm'

const UNITS: Record<Frequency, (inputs: { count: number }) => string> = {
  daily: m.setup_recurring_unit_day,
  weekly: m.setup_recurring_unit_week,
  monthly: m.setup_recurring_unit_month,
  yearly: m.setup_recurring_unit_year,
}

const minorToText = (minor: number, currency: string) =>
  String(minor / 10 ** currencyDigits(currency))

export function RecurringForm({
  spaceId,
  rule,
  draft,
  today,
  pending,
  error,
  onSubmit,
}: {
  spaceId: string
  // Absent for a new rule.
  rule?: RecurringRule
  // Values for a new rule, e.g. from a detected subscription.
  draft?: Partial<RuleValues>
  today: string
  pending: boolean
  error?: string
  onSubmit: (values: RuleValues) => void
}) {
  const { data: options } = useSuspenseQuery(formOptionsQuery(spaceId))
  const firstWallet = options.wallets[0]
  const initial: Partial<RuleValues> | undefined = rule ?? draft
  const [type, setType] = useState<RuleType>(initial?.type ?? 'expense')
  const [walletId, setWalletId] = useState(
    initial?.walletId ?? firstWallet?.id ?? '',
  )
  const [toWalletId, setToWalletId] = useState(initial?.toWalletId ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const wallet = options.wallets.find((w) => w.id === walletId)
  const currency = wallet?.currency ?? 'EUR'
  const [amount, setAmount] = useState(
    initial?.amount ? minorToText(initial.amount, currency) : '',
  )
  const [payee, setPayee] = useState(initial?.payee ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [frequencyValue, setFrequency] = useState<Frequency>(
    initial?.frequency ?? 'monthly',
  )
  const [interval, setEvery] = useState(initial?.interval ?? 1)
  const [startDate, setStartDate] = useState(initial?.startDate ?? today)
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [localError, setLocalError] = useState<string | null>(null)

  if (!firstWallet) {
    return (
      <p className="pb-6 text-muted-foreground">
        {m.setup_recurring_form_no_wallet()}
      </p>
    )
  }

  const submit = () => {
    const minor = parseAmount(amount, currencyDigits(currency))
    if (!minor) return setLocalError(m.setup_recurring_form_amount_invalid())
    if (type === 'transfer' && !toWalletId)
      return setLocalError(m.setup_recurring_form_choose_to_wallet())
    if (type !== 'transfer' && !categoryId)
      return setLocalError(m.setup_recurring_form_choose_category())
    setLocalError(null)
    onSubmit({
      type,
      walletId,
      amount: minor,
      categoryId: type === 'transfer' ? null : categoryId,
      toWalletId: type === 'transfer' ? toWalletId : null,
      toAmount: null,
      payee,
      note,
      frequency: frequencyValue,
      interval,
      startDate,
      endDate: endDate || null,
    })
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <fieldset>
        <legend className="sr-only">{m.setup_form_type()}</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {(['expense', 'income', 'transfer'] as const).map((value) => (
            <label
              key={value}
              className="flex h-8 cursor-pointer items-center justify-center rounded-md text-sm capitalize has-checked:bg-card has-checked:shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="rule-type"
                value={value}
                checked={type === value}
                onChange={() => {
                  setType(value)
                  setCategoryId('')
                }}
                className="sr-only"
              />
              {value === 'expense'
                ? m.setup_type_expense()
                : value === 'income'
                  ? m.setup_type_income()
                  : m.setup_type_transfer()}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={m.setup_recurring_form_amount({ currency })}
          htmlFor="rule-amount"
        >
          <Input
            id="rule-amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field
          label={
            type === 'transfer'
              ? m.setup_recurring_form_from_wallet()
              : m.setup_recurring_form_wallet()
          }
          htmlFor="rule-wallet"
        >
          <select
            id="rule-wallet"
            className={selectClass}
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
          >
            {options.wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {type === 'transfer' ? (
        <Field
          label={m.setup_recurring_form_to_wallet()}
          htmlFor="rule-to-wallet"
        >
          <select
            id="rule-to-wallet"
            className={selectClass}
            value={toWalletId}
            onChange={(e) => setToWalletId(e.target.value)}
          >
            <option value="">{m.setup_recurring_form_choose_wallet()}</option>
            {options.wallets
              .filter((w) => w.id !== walletId)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </select>
        </Field>
      ) : (
        <Field label={m.setup_form_category()} htmlFor="rule-category">
          <select
            id="rule-category"
            className={selectClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{m.setup_categories_choose()}</option>
            {categoryOrder(options.categories, type).map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId ? ` ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field
        label={
          type === 'income'
            ? m.setup_recurring_form_payee_from()
            : m.setup_recurring_form_payee_to()
        }
        htmlFor="rule-payee"
      >
        <Input
          id="rule-payee"
          value={payee}
          maxLength={120}
          autoComplete="off"
          onChange={(e) => setPayee(e.target.value)}
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium text-sm">
          {m.setup_recurring_form_repeats()}
        </legend>
        <div className="flex items-center gap-2">
          <span className="text-sm">{m.setup_recurring_form_every()}</span>
          <Input
            aria-label={m.setup_recurring_form_interval()}
            type="number"
            min={1}
            max={365}
            className="w-20"
            value={interval}
            onChange={(e) => setEvery(Math.max(1, Number(e.target.value) || 1))}
          />
          <select
            aria-label={m.setup_recurring_form_unit()}
            className={selectClass}
            value={frequencyValue}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            {Object.entries(UNITS).map(([value, unit]) => (
              <option key={value} value={value}>
                {unit({ count: interval })}
              </option>
            ))}
          </select>
        </div>
        <p className="text-muted-foreground text-sm">
          {describeSchedule({ startDate, frequency: frequencyValue, interval })}
          {endDate ? m.setup_recurring_form_until({ date: endDate }) : ''}
        </p>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={m.setup_recurring_form_first_payment()}
          htmlFor="rule-start"
        >
          <Input
            id="rule-start"
            type="date"
            value={startDate}
            required
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label={m.setup_recurring_form_last_payment()} htmlFor="rule-end">
          <Input
            id="rule-end"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
      </div>
      {!rule && startDate < today && (
        <p className="-mt-3 text-muted-foreground text-sm">
          {m.setup_recurring_form_backfill_hint()}
        </p>
      )}

      <Field label={m.setup_recurring_form_note()} htmlFor="rule-note">
        <Input
          id="rule-note"
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      <FormError message={localError ?? error ?? null} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending
          ? m.setup_form_saving()
          : rule
            ? m.setup_form_save_changes()
            : m.setup_recurring_form_create()}
      </Button>
    </form>
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
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
