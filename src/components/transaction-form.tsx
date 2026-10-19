import { useForm } from '@tanstack/react-form'
import { useDebouncedValue } from '@tanstack/react-pacer'
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { Link, useRouteContext } from '@tanstack/react-router'
import { Camera, Plus, Sparkles, Split, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { iconFor } from '@/lib/icons'
import { currencyDigits, formatMoney, parseAmount } from '@/lib/money'
import { useDeleteWithUndo, useSaveTransaction } from '@/lib/mutations'
import { formOptionsQuery, payeesQuery, useActiveSpace } from '@/lib/queries'
import { parseQuickEntry, type QuickEntry } from '@/lib/quick-entry'
import { addDays, localTodayIso } from '@/lib/recurrence'
import { resizeImage } from '@/lib/resize-image'
import { ruleFor } from '@/lib/rules'
import { cn } from '@/lib/utils'
import { uuidv7 } from '@/lib/uuid'
import { readReceipt } from '@/server/ai'
import type { LedgerTransaction } from '@/server/ledger'
import { deleteReceipt, saveReceipt } from '@/server/receipts'
import type { TransactionType } from '@/stores/quick-add'

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
]

interface FormValues {
  type: TransactionType
  amount: string
  payee: string
  categoryId: string
  walletId: string
  toWalletId: string
  toAmount: string
  date: string
  note: string
  tagIds: string[]
  // A member who paid from their own money (shared spaces); empty for shared money.
  paidBy: string
  // Parts of a split receipt; empty when the transaction has one category.
  splits: { categoryId: string; amount: string }[]
}

const amountField = z
  .string()
  .refine((value) => (parseAmount(value) ?? 0) > 0, 'Enter an amount.')

const formSchema = z
  .object({
    type: z.enum(['income', 'expense', 'transfer']),
    amount: amountField,
    payee: z.string().max(120),
    categoryId: z.string(),
    walletId: z.string().min(1, 'Choose a wallet.'),
    toWalletId: z.string(),
    toAmount: z.string(),
    date: z.iso.date('Choose a date.'),
    note: z.string().max(2000),
    tagIds: z.array(z.string()),
    paidBy: z.string(),
    splits: z.array(z.object({ categoryId: z.string(), amount: z.string() })),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'transfer') {
      if (!value.toWalletId || value.toWalletId === value.walletId) {
        ctx.addIssue({
          code: 'custom',
          path: ['toWalletId'],
          message: 'Choose a different wallet to move the money to.',
        })
      }
    } else if (value.splits.length > 0) {
      if (
        value.splits.some((p) => !p.categoryId || !(parseAmount(p.amount) ?? 0))
      )
        ctx.addIssue({
          code: 'custom',
          path: ['splits'],
          message: 'Give every part a category and an amount.',
        })
    } else if (!value.categoryId) {
      ctx.addIssue({
        code: 'custom',
        path: ['categoryId'],
        message: 'Choose a category.',
      })
    }
  })

const errorText = (errors: unknown[]) =>
  errors
    .map((e) =>
      typeof e === 'string' ? e : (e as { message?: string })?.message,
    )
    .filter(Boolean)[0]

function FieldError({ errors }: { errors: unknown[] }) {
  const message = errorText(errors)
  return message ? <p className="text-destructive text-sm">{message}</p> : null
}

const toInputAmount = (minor: number, currency: string) => {
  const digits = currencyDigits(currency)
  return (minor / 10 ** digits).toFixed(digits)
}

interface Props {
  // Absent for a new transaction.
  transaction?: LedgerTransaction
  initialType: TransactionType
  onDone: () => void
}

export function TransactionForm({ transaction, initialType, onDone }: Props) {
  const space = useActiveSpace()
  const { user } = useRouteContext({ from: '/_app' })
  const { data: options } = useSuspenseQuery(formOptionsQuery(space.id))
  const save = useSaveTransaction(space.id)
  const queryClient = useQueryClient()
  const [receiptChange, setReceiptChange] = useState<ReceiptChange>(null)
  const deleteWithUndo = useDeleteWithUndo(space.id)

  const walletById = (id: string) => options.wallets.find((w) => w.id === id)
  const firstWallet = options.wallets[0]?.id ?? ''
  const defaults: FormValues = transaction
    ? {
        type: transaction.type,
        amount: toInputAmount(transaction.amount, transaction.wallet.currency),
        payee: transaction.payee ?? '',
        categoryId: transaction.category?.id ?? '',
        walletId: transaction.wallet.id,
        toWalletId: transaction.toWallet?.id ?? '',
        toAmount:
          transaction.toAmount !== null && transaction.toWallet
            ? toInputAmount(transaction.toAmount, transaction.toWallet.currency)
            : '',
        date: transaction.date,
        note: transaction.note ?? '',
        tagIds: transaction.tags.map(({ tag }) => tag.id),
        paidBy: transaction.paidBy ?? '',
        splits: transaction.splits.map((p) => ({
          categoryId: p.category.id,
          amount: toInputAmount(p.amount, transaction.wallet.currency),
        })),
      }
    : {
        type: initialType,
        amount: '',
        payee: '',
        categoryId: '',
        walletId: firstWallet,
        toWalletId: options.wallets.find((w) => w.id !== firstWallet)?.id ?? '',
        toAmount: '',
        date: localTodayIso(),
        note: '',
        tagIds: [],
        paidBy: '',
        splits: [],
      }

  const form = useForm({
    defaultValues: defaults,
    validators: { onSubmit: formSchema },
    onSubmit: ({ value }) => {
      const from = walletById(value.walletId)
      const to = walletById(value.toWalletId)
      if (!from) return
      const isTransfer = value.type === 'transfer'
      const crossCurrency = isTransfer && to && to.currency !== from.currency
      const amount =
        parseAmount(value.amount, currencyDigits(from.currency)) ?? 0
      const toAmount = crossCurrency
        ? (parseAmount(value.toAmount, currencyDigits(to.currency)) ?? amount)
        : null
      const splits = isTransfer
        ? []
        : value.splits.map((p) => ({
            categoryId: p.categoryId,
            amount: parseAmount(p.amount, currencyDigits(from.currency)) ?? 0,
          }))
      const split = splits.length > 0
      if (split && splits.reduce((sum, p) => sum + p.amount, 0) !== amount) {
        form.setFieldMeta('splits', (meta) => ({
          ...meta,
          errorMap: { onSubmit: 'The parts must add up to the amount.' },
        }))
        return
      }
      const cat = options.categories.find((c) => c.id === value.categoryId)
      const tagIds = isTransfer ? [] : value.tagIds
      const id = transaction?.id ?? uuidv7()
      const payee = isTransfer ? null : value.payee.trim() || null
      const note = value.note.trim() || null
      const paidBy = (value.type === 'expense' && value.paidBy) || null

      const saved = save.mutateAsync({
        mode: transaction ? 'edit' : 'create',
        input: {
          spaceId: space.id,
          id,
          type: value.type,
          date: value.date,
          walletId: from.id,
          amount,
          categoryId: isTransfer || split ? null : value.categoryId,
          toWalletId: isTransfer ? value.toWalletId : null,
          toAmount,
          payee,
          note,
          tagIds,
          paidBy,
          splits: splits.map((p) => ({ ...p, note: null })),
        },
        optimistic: {
          id,
          type: value.type,
          date: value.date,
          amount,
          toAmount,
          payee,
          note,
          paidBy,
          // A new photo shows once it is uploaded and the list refetches.
          receiptVersion: receiptChange
            ? null
            : (transaction?.receiptVersion ?? null),
          recurringRuleId: transaction?.recurringRuleId ?? null,
          category:
            !isTransfer && !split && cat
              ? { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color }
              : null,
          splits: splits.flatMap((p, i) => {
            const c = options.categories.find((x) => x.id === p.categoryId)
            return c
              ? [
                  {
                    id: `${id}-${i}`,
                    amount: p.amount,
                    note: null,
                    category: {
                      id: c.id,
                      name: c.name,
                      icon: c.icon,
                      color: c.color,
                    },
                  },
                ]
              : []
          }),
          wallet: { id: from.id, name: from.name, currency: from.currency },
          toWallet:
            isTransfer && to
              ? { id: to.id, name: to.name, currency: to.currency }
              : null,
          author: transaction?.author ?? { id: user.id, name: user.name },
          tags: options.tags
            .filter((t) => tagIds.includes(t.id))
            .map((tag) => ({ tag })),
        },
      })
      // Errors of the save itself are shown by the mutation; the photo follows the row.
      saved
        .then(() =>
          receiptChange
            ? applyReceipt(space.id, id, receiptChange).then(() =>
                queryClient.invalidateQueries({
                  queryKey: ['space', space.id],
                }),
              )
            : undefined,
        )
        .catch(() => {})
      onDone()
    },
  })

  // Fills the form from a typed line (AI-02) or a read receipt (AI-01); fields the source
  // did not mention keep their value.
  const fillIn = (entry: QuickEntry) => {
    const type = entry.type ?? form.getFieldValue('type')
    if (entry.type) {
      form.setFieldValue('type', entry.type)
      form.setFieldValue('splits', [])
    }
    if (entry.amount) form.setFieldValue('amount', entry.amount)
    if (entry.walletId) form.setFieldValue('walletId', entry.walletId)
    if (entry.date) form.setFieldValue('date', entry.date)
    if (entry.payee) form.setFieldValue('payee', entry.payee)
    // A rule for the payee fills the category when the source named none.
    const categoryId =
      entry.categoryId ??
      (entry.payee
        ? ruleFor(entry.payee, type, options.rules)?.categoryId
        : undefined)
    const current = options.categories.find(
      (c) => c.id === form.getFieldValue('categoryId'),
    )
    if (categoryId) form.setFieldValue('categoryId', categoryId)
    else if (current && current.type !== type)
      form.setFieldValue('categoryId', '')
  }

  if (!options.canWrite) {
    return (
      <p className="px-4 pb-6 text-muted-foreground">
        You can view this space but not change it. Ask an owner to make you an
        editor.
      </p>
    )
  }
  if (options.wallets.length === 0) {
    return (
      <p className="px-4 pb-6 text-muted-foreground">
        Add a wallet first, so the app knows where the money goes.{' '}
        <Link
          to="/wallets"
          className="text-foreground underline"
          onClick={onDone}
        >
          Add a wallet
        </Link>
      </p>
    )
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5 px-4 pb-4"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        form.handleSubmit()
      }}
    >
      {!transaction && (
        <QuickEntryField
          onParse={(text) =>
            fillIn(
              parseQuickEntry(text, {
                today: localTodayIso(),
                wallets: options.wallets,
                categories: options.categories,
              }),
            )
          }
        />
      )}

      <form.Field name="type">
        {(field) => (
          <fieldset className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            <legend className="sr-only">Type</legend>
            {TYPES.map((t) => (
              <label
                key={t.value}
                className="flex h-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground text-sm has-checked:bg-card has-checked:font-medium has-checked:text-foreground has-checked:shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-ring"
              >
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  checked={field.state.value === t.value}
                  onChange={() => {
                    field.handleChange(t.value)
                    const current = options.categories.find(
                      (c) => c.id === form.getFieldValue('categoryId'),
                    )
                    if (current && current.type !== t.value) {
                      form.setFieldValue('categoryId', '')
                    }
                    form.setFieldValue('splits', [])
                  }}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </fieldset>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.values.walletId}>
        {(walletId) => (
          <form.Field name="amount">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount" className="sr-only">
                  Amount in {walletById(walletId)?.currency}
                </Label>
                <div className="flex items-baseline gap-2 border-input border-b-2 pb-1 focus-within:border-ring">
                  <span className="text-2xl text-muted-foreground">
                    {walletById(walletId)?.currency}
                  </span>
                  <input
                    id="amount"
                    inputMode="decimal"
                    autoComplete="off"
                    // biome-ignore lint/a11y/noAutofocus: the sheet was just opened to enter an amount, focus belongs here
                    autoFocus={!transaction}
                    placeholder="0.00"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="min-w-0 flex-1 bg-transparent font-semibold text-4xl tracking-tight outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
                <AmountSum
                  value={field.state.value}
                  currency={walletById(walletId)?.currency ?? 'EUR'}
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>
        )}
      </form.Subscribe>

      <form.Subscribe selector={(s) => s.values.type}>
        {(type) =>
          type === 'transfer' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <form.Field name="walletId">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="from-wallet">From</Label>
                      <WalletSelect
                        id="from-wallet"
                        value={field.state.value}
                        onChange={field.handleChange}
                        wallets={options.wallets}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="toWalletId">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="to-wallet">To</Label>
                      <WalletSelect
                        id="to-wallet"
                        value={field.state.value}
                        onChange={field.handleChange}
                        wallets={options.wallets}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  )}
                </form.Field>
              </div>
              <form.Subscribe
                selector={(s) =>
                  [s.values.walletId, s.values.toWalletId] as const
                }
              >
                {([fromId, toId]) => {
                  const from = walletById(fromId)
                  const to = walletById(toId)
                  if (!from || !to || from.currency === to.currency) return null
                  return (
                    <form.Field name="toAmount">
                      {(field) => (
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="to-amount">
                            Amount received in {to.currency}
                          </Label>
                          <Input
                            id="to-amount"
                            inputMode="decimal"
                            placeholder="Same as sent"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                        </div>
                      )}
                    </form.Field>
                  )
                }}
              </form.Subscribe>
            </>
          ) : (
            <>
              <form.Field name="payee">
                {(field) => (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="payee">
                      {type === 'income' ? 'From' : 'Paid to'}
                    </Label>
                    <Input
                      id="payee"
                      autoComplete="off"
                      placeholder={
                        type === 'income'
                          ? 'Employer, client, person'
                          : 'Shop, person, service'
                      }
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value)
                        // A rule (M-15) fills the category of a new transaction
                        // until the user picks one.
                        const rule = ruleFor(
                          e.target.value,
                          type,
                          options.rules,
                        )
                        if (
                          rule &&
                          !transaction &&
                          !form.getFieldMeta('categoryId')?.isTouched
                        )
                          form.setFieldValue('categoryId', rule.categoryId, {
                            dontUpdateMeta: true,
                          })
                      }}
                    />
                    <PayeeSuggestions
                      spaceId={space.id}
                      query={field.state.value}
                      type={type}
                      onPick={(suggestion) => {
                        field.handleChange(suggestion.payee)
                        // Payee memory: start from what was used last time.
                        if (suggestion.categoryId) {
                          form.setFieldValue(
                            'categoryId',
                            suggestion.categoryId,
                          )
                        }
                        if (walletById(suggestion.walletId)) {
                          form.setFieldValue('walletId', suggestion.walletId)
                        }
                      }}
                    />
                  </div>
                )}
              </form.Field>
              <form.Subscribe selector={(s) => s.values.splits.length > 0}>
                {(isSplit) =>
                  isSplit ? (
                    <form.Subscribe
                      selector={(s) => [s.values.amount, s.values.walletId]}
                    >
                      {([total, walletId]) => (
                        <form.Field name="splits">
                          {(field) => (
                            <SplitEditor
                              value={field.state.value}
                              onChange={field.handleChange}
                              errors={field.state.meta.errors}
                              total={total}
                              currency={walletById(walletId)?.currency ?? 'EUR'}
                              categories={categoryOrder(
                                options.categories,
                                type,
                              )}
                            />
                          )}
                        </form.Field>
                      )}
                    </form.Subscribe>
                  ) : (
                    <form.Field name="categoryId">
                      {(field) => (
                        <fieldset className="flex flex-col gap-2">
                          <legend className="mb-2 font-medium text-sm">
                            Category
                          </legend>
                          <div className="flex flex-wrap gap-2">
                            {categoryOrder(options.categories, type).map(
                              (c) => {
                                const Icon = iconFor(c.icon)
                                return (
                                  <label
                                    key={c.id}
                                    className={cn(
                                      'flex h-9 cursor-pointer items-center gap-1.5 rounded-full border bg-card px-3 text-sm has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-2 has-focus-visible:ring-ring',
                                      c.parentId && 'ml-1',
                                    )}
                                  >
                                    <input
                                      type="radio"
                                      name="categoryId"
                                      value={c.id}
                                      checked={field.state.value === c.id}
                                      onChange={() => field.handleChange(c.id)}
                                      className="sr-only"
                                    />
                                    <Icon
                                      className="size-4"
                                      style={{ color: c.color }}
                                    />
                                    {c.name}
                                  </label>
                                )
                              },
                            )}
                          </div>
                          <FieldError errors={field.state.meta.errors} />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-fit"
                            onClick={() =>
                              form.setFieldValue('splits', [
                                { categoryId: field.state.value, amount: '' },
                                { categoryId: '', amount: '' },
                              ])
                            }
                          >
                            <Split />
                            Split across categories
                          </Button>
                        </fieldset>
                      )}
                    </form.Field>
                  )
                }
              </form.Subscribe>
              <form.Field name="walletId">
                {(field) => (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="wallet">Wallet</Label>
                    <WalletSelect
                      id="wallet"
                      value={field.state.value}
                      onChange={field.handleChange}
                      wallets={options.wallets}
                    />
                  </div>
                )}
              </form.Field>
              {type === 'expense' && options.members.length > 0 && (
                <form.Field name="paidBy">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="paid-by">Paid by</Label>
                      <select
                        id="paid-by"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-describedby="paid-by-hint"
                        className="h-10 rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                      >
                        <option value="">Shared money</option>
                        {options.members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.id === user.id ? `${m.name} (you)` : m.name}
                          </option>
                        ))}
                      </select>
                      <p
                        id="paid-by-hint"
                        className="text-muted-foreground text-xs"
                      >
                        Someone who paid from their own money gets it back from
                        the others in equal shares.
                      </p>
                    </div>
                  )}
                </form.Field>
              )}
            </>
          )
        }
      </form.Subscribe>

      <form.Field name="date">
        {(field) => {
          const today = localTodayIso()
          return (
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <div className="flex gap-2">
                <Input
                  id="date"
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="flex-1"
                />
                {[
                  { label: 'Today', date: today },
                  { label: 'Yesterday', date: addDays(today, -1) },
                ].map((quick) => (
                  <Button
                    key={quick.label}
                    type="button"
                    variant={
                      field.state.value === quick.date ? 'secondary' : 'outline'
                    }
                    aria-pressed={field.state.value === quick.date}
                    onClick={() => field.handleChange(quick.date)}
                  >
                    {quick.label}
                  </Button>
                ))}
              </div>
              <FieldError errors={field.state.meta.errors} />
            </div>
          )
        }}
      </form.Field>

      <form.Subscribe selector={(s) => s.values.type}>
        {(type) =>
          type !== 'transfer' &&
          options.tags.length > 0 && (
            <form.Field name="tagIds">
              {(field) => (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 font-medium text-sm">Tags</legend>
                  <div className="flex flex-wrap gap-2">
                    {options.tags.map((t) => (
                      <label
                        key={t.id}
                        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border bg-card px-2.5 text-sm has-checked:border-foreground has-checked:font-medium has-focus-visible:ring-2 has-focus-visible:ring-ring"
                      >
                        <input
                          type="checkbox"
                          checked={field.state.value.includes(t.id)}
                          onChange={(e) =>
                            field.handleChange(
                              e.target.checked
                                ? [...field.state.value, t.id]
                                : field.state.value.filter((id) => id !== t.id),
                            )
                          }
                          className="sr-only"
                        />
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </form.Field>
          )
        }
      </form.Subscribe>

      <form.Field name="note">
        {(field) => (
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Note</Label>
            <textarea
              id="note"
              rows={2}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Optional"
              className="rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
            />
          </div>
        )}
      </form.Field>

      <ReceiptField
        transactionId={transaction?.id}
        version={transaction?.receiptVersion ?? null}
        change={receiptChange}
        onChange={setReceiptChange}
        read={
          options.canReadReceipts
            ? async (image) => {
                const result = await readReceipt({
                  data: { spaceId: space.id, image },
                })
                fillIn({
                  type: 'expense',
                  amount: result.amount ?? undefined,
                  date: result.date ?? undefined,
                  payee: result.payee ?? undefined,
                  categoryId: result.categoryId ?? undefined,
                })
              }
            : undefined
        }
      />

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {transaction && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-label="Delete transaction"
            onClick={() => {
              onDone()
              deleteWithUndo(transaction)
            }}
          >
            <Trash2 className="text-destructive" />
          </Button>
        )}
        <form.Subscribe selector={(s) => s.values.type}>
          {(type) => (
            <Button type="submit" size="lg" className="flex-1">
              {transaction ? 'Save changes' : `Save ${type}`}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

type Category = {
  id: string
  name: string
  type: string
  parentId: string | null
}

// Parents followed by their children, so groups stay together.
export function categoryOrder<T extends Category>(
  categories: T[],
  type: string,
) {
  const ofType = categories.filter((c) => c.type === type)
  return ofType
    .filter((c) => !c.parentId)
    .flatMap((parent) => [
      parent,
      ...ofType.filter((c) => c.parentId === parent.id),
    ])
}

type Wallet = { id: string; name: string; currency: string }

function WalletSelect({
  id,
  value,
  onChange,
  wallets,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  wallets: Wallet[]
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
    >
      {wallets.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name} ({w.currency})
        </option>
      ))}
    </select>
  )
}

interface Suggestion {
  payee: string
  type: string
  categoryId: string | null
  walletId: string
}

function PayeeSuggestions({
  spaceId,
  query,
  type,
  onPick,
}: {
  spaceId: string
  query: string
  type: TransactionType
  onPick: (suggestion: Suggestion) => void
}) {
  const [debouncedQuery] = useDebouncedValue(query.trim(), { wait: 200 })
  const { data = [] } = useQuery({
    ...payeesQuery(spaceId, debouncedQuery),
    placeholderData: keepPreviousData,
  })
  const suggestions = data.filter(
    (s) =>
      s.type === type && s.payee.toLowerCase() !== query.trim().toLowerCase(),
  )
  if (suggestions.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Suggestions">
      {suggestions.map((s) => (
        <li key={s.payee}>
          <button
            type="button"
            onClick={() => onPick(s)}
            className="h-8 rounded-full bg-muted px-3 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            {s.payee}
          </button>
        </li>
      ))}
    </ul>
  )
}

// "= €16.50" under the amount while it is a sum like "12+4.50".
function AmountSum({ value, currency }: { value: string; currency: string }) {
  if (!/\d\s*[+\-−*×/÷]\s*\d/.test(value)) return null
  const minor = parseAmount(value, currencyDigits(currency))
  return (
    <p className="text-muted-foreground text-sm" aria-live="polite">
      {minor === null ? 'Not a valid sum' : `= ${formatMoney(minor, currency)}`}
    </p>
  )
}

// The parts of a split receipt (M-14): a category and an amount each, with what is still
// left to assign. Removing all but one part turns the split off again.
function SplitEditor({
  value,
  onChange,
  errors,
  total,
  currency,
  categories,
}: {
  value: { categoryId: string; amount: string }[]
  onChange: (value: { categoryId: string; amount: string }[]) => void
  errors: unknown[]
  total: string
  currency: string
  categories: Category[]
}) {
  const digits = currencyDigits(currency)
  const assigned = value.reduce(
    (sum, p) => sum + (parseAmount(p.amount, digits) ?? 0),
    0,
  )
  const left = (parseAmount(total, digits) ?? 0) - assigned
  const update = (index: number, change: Partial<(typeof value)[number]>) =>
    onChange(value.map((p, i) => (i === index ? { ...p, ...change } : p)))
  const remove = (index: number) => {
    const rest = value.filter((_, i) => i !== index)
    // One part left is no split: it becomes the category.
    onChange(rest.length < 2 ? [] : rest)
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium text-sm">
        Split across categories
      </legend>
      <ul className="flex flex-col gap-2">
        {value.map((part, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: parts have no id until saved, and their order is stable
          <li key={i} className="flex gap-2">
            <select
              aria-label={`Category of part ${i + 1}`}
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
              value={part.categoryId}
              onChange={(e) => update(i, { categoryId: e.target.value })}
            >
              <option value="">Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `  ${c.name}` : c.name}
                </option>
              ))}
            </select>
            <Input
              aria-label={`Amount of part ${i + 1}`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              className="w-28"
              value={part.amount}
              onChange={(e) => update(i, { amount: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove part ${i + 1}`}
              onClick={() => remove(i)}
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...value,
              {
                categoryId: '',
                // The next part starts with what is still unassigned.
                amount: left > 0 ? (left / 10 ** digits).toFixed(digits) : '',
              },
            ])
          }
        >
          <Plus />
          Add a part
        </Button>
        <p
          aria-live="polite"
          className={cn('text-sm', left !== 0 && 'text-muted-foreground')}
        >
          {left === 0
            ? 'Adds up'
            : left > 0
              ? `${formatMoney(left, currency)} left to assign`
              : `${formatMoney(-left, currency)} too much`}
        </p>
      </div>
      <FieldError errors={errors} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => onChange([])}
      >
        Don't split
      </Button>
    </fieldset>
  )
}

// "coffee 3.20 cash yesterday" fills the form below; read in the browser (src/lib/quick-entry.ts).
function QuickEntryField({ onParse }: { onParse: (text: string) => void }) {
  const [text, setText] = useState('')
  const apply = () => {
    if (!text.trim()) return
    onParse(text)
    setText('')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="quick-entry" className="text-muted-foreground text-xs">
        Or type it
      </Label>
      <div className="flex gap-2">
        <Input
          id="quick-entry"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="coffee 3.20 cash yesterday"
          aria-describedby="quick-entry-hint"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter fills the form instead of saving it.
            if (e.key === 'Enter') {
              e.preventDefault()
              apply()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={apply}>
          Fill in
        </Button>
      </div>
      <p id="quick-entry-hint" className="sr-only">
        Amount, payee, category, wallet and a day like yesterday or Friday, in
        any order. Fills the fields below.
      </p>
    </div>
  )
}

// What the form does to the receipt photo on save: nothing, a new photo, or remove it.
type ReceiptChange = { image: string } | 'remove' | null

async function applyReceipt(
  spaceId: string,
  transactionId: string,
  change: Exclude<ReceiptChange, null>,
) {
  try {
    if (change === 'remove')
      await deleteReceipt({ data: { spaceId, transactionId } })
    else
      await saveReceipt({
        data: { spaceId, transactionId, image: change.image },
      })
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : 'Could not save the receipt.',
    )
  }
}

// Receipt photo (I-04): taken or picked on the phone, shrunk in the browser, uploaded on
// save.
function ReceiptField({
  transactionId,
  version,
  change,
  onChange,
  read,
}: {
  transactionId?: string
  version: number | null
  change: ReceiptChange
  onChange: (change: ReceiptChange) => void
  // Fills the form from the photo with Claude (AI-01), when the user switched it on.
  read?: (image: string) => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const current =
    change && change !== 'remove'
      ? change.image
      : change === null && version !== null && transactionId
        ? `/api/receipts/${transactionId}?v=${version}`
        : null

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-sm">Receipt</span>
      {current ? (
        <div className="flex flex-wrap items-end gap-3">
          <a
            href={current}
            target="_blank"
            rel="noreferrer"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src={current}
              alt="Receipt photo, opens full size"
              className="h-24 w-auto rounded-md border object-cover"
            />
          </a>
          {read && change && change !== 'remove' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={analysing}
              onClick={async () => {
                setError(null)
                setAnalysing(true)
                try {
                  await read(change.image)
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : 'Could not read it.',
                  )
                } finally {
                  setAnalysing(false)
                }
              }}
            >
              <Sparkles />
              {analysing ? 'Reading' : 'Fill in from photo'}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            // A just-picked photo goes back to the saved one (if any).
            onClick={() => onChange(change ? null : 'remove')}
          >
            Remove photo
          </Button>
        </div>
      ) : (
        <label className="flex h-10 w-fit cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 text-sm shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-ring">
          <Camera className="size-4" aria-hidden="true" />
          {reading ? 'Reading photo' : 'Add a photo'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={reading}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              setError(null)
              setReading(true)
              try {
                onChange({ image: await resizeImage(file) })
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Could not read it.',
                )
              } finally {
                setReading(false)
              }
            }}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
