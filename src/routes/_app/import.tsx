import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, CopyCheck, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { FormError } from '@/components/auth-page'
import { categoryOrder } from '@/components/transaction-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseCsv } from '@/lib/csv'
import { formatShortDate } from '@/lib/format-date'
import {
  DATE_FORMATS,
  type DateFormat,
  fitsHeader,
  guessDateFormat,
  type ImportMapping,
  parseDate,
  parseSignedAmount,
} from '@/lib/import'
import { formatLocale } from '@/lib/locale'
import { currencyDigits, formatSignedMoney, parseAmount } from '@/lib/money'
import { formOptionsQuery, importsQuery, useActiveSpace } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import {
  getImportMapping,
  type ImportRecord,
  importTransactions,
  reviewImport,
  undoImport,
} from '@/server/import'
import { saveRules } from '@/server/rules'

export const Route = createFileRoute('/_app/import')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      formOptionsQuery(context.activeSpaceId),
    ),
  head: () => ({ meta: [{ title: m.setup_import_meta_title() }] }),
  component: Import,
})

const selectClass =
  'h-9 w-full rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm'

type Mapping = ImportMapping

// Within the server's limits, the same way for lookup and save.
const layoutHeader = (header: string[]) =>
  header.slice(0, 100).map((cell) => cell.slice(0, 200))

interface Staged {
  date: string
  amount: number
  payee: string
}

interface Reviewed extends Staged {
  include: boolean
  duplicate: boolean
  categoryId: string
  // What the rules or the payee history suggested; a different pick can become a rule.
  suggested: string
}

// Rows whose category the user chose differently from the suggestion, as rules for their
// payee (the whole payee text, so a rule never matches more than intended).
const rulesToRemember = (rows: Reviewed[]) =>
  rows
    .filter((r) => r.payee.trim().length >= 2 && r.categoryId !== r.suggested)
    .map((r) => ({
      type: r.amount > 0 ? ('income' as const) : ('expense' as const),
      match: r.payee.trim().slice(0, 60),
      categoryId: r.categoryId,
    }))

// Guesses columns from common header names in English, German, Slovak and Hungarian.
function guessMapping(header: string[], rows: string[][]): Mapping {
  const find = (pattern: RegExp, fallback: number) => {
    const index = header.findIndex((h) => pattern.test(h))
    return index === -1 ? fallback : index
  }
  const date = find(/date|datum|dátum|buchung/i, 0)
  return {
    date,
    dateFormat: guessDateFormat(
      rows
        .slice(0, 20)
        .map((r) => r[date] ?? '')
        .filter(Boolean),
    ),
    amount: find(/amount|betrag|suma|összeg|value/i, 1),
    outColumn: find(/debit|out|withdraw|výdav/i, 1),
    inColumn: find(/credit|in\b|deposit|príjem/i, 2),
    split: false,
    payee: find(
      /payee|description|merchant|name|counterparty|partner|popis|empfänger/i,
      -1,
    ),
  }
}

function stage(rows: string[][], mapping: Mapping, digits: number) {
  const parse = (text: string) => parseAmount(text, digits)
  return rows.map((row): Staged | null => {
    const date = parseDate(row[mapping.date] ?? '', mapping.dateFormat)
    let amount: number | null
    if (mapping.split) {
      const out = parseSignedAmount(row[mapping.outColumn] ?? '', parse)
      const income = parseSignedAmount(row[mapping.inColumn] ?? '', parse)
      amount = out ? -Math.abs(out) : income ? Math.abs(income) : null
    } else {
      amount = parseSignedAmount(row[mapping.amount] ?? '', parse)
    }
    if (!date || !amount) return null
    return {
      date,
      amount,
      payee: mapping.payee >= 0 ? (row[mapping.payee] ?? '').slice(0, 120) : '',
    }
  })
}

function Import() {
  const space = useActiveSpace()
  const { data: options } = useSuspenseQuery(formOptionsQuery(space.id))
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [walletId, setWalletId] = useState(options.wallets[0]?.id ?? '')
  const [header, setHeader] = useState<string[] | null>(null)
  const [fileName, setFileName] = useState<string | undefined>()
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Mapping | null>(null)
  // The columns came from the last import of a file with the same header row.
  const [remembered, setRemembered] = useState(false)
  const [reviewed, setReviewed] = useState<Reviewed[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const wallet = options.wallets.find((w) => w.id === walletId)
  const currency = wallet?.currency ?? space.baseCurrency
  const staged = mapping ? stage(rows, mapping, currencyDigits(currency)) : []
  const readable = staged.filter((r): r is Staged => r !== null)

  const readFile = async (file: File) => {
    setError(null)
    setFileName(file.name.slice(0, 200))
    const parsed = parseCsv(await file.text())
    if (parsed.length < 2) {
      setError(m.setup_import_no_rows())
      return
    }
    const [fileHeader, ...fileRows] = parsed
    const saved = await getImportMapping({
      data: { spaceId: space.id, header: layoutHeader(fileHeader) },
    }).catch(() => null)
    const reuse = saved !== null && fitsHeader(saved.mapping, fileHeader)
    if (reuse && options.wallets.some((w) => w.id === saved.walletId))
      setWalletId(saved.walletId ?? walletId)
    setHeader(fileHeader)
    setRows(fileRows)
    setMapping(reuse ? saved.mapping : guessMapping(fileHeader, fileRows))
    setRemembered(reuse)
    setReviewed(null)
  }

  const review = async () => {
    setError(null)
    setPending(true)
    try {
      const result = await reviewImport({
        data: { spaceId: space.id, walletId, rows: readable },
      })
      setReviewed(
        readable.map((row, i) => ({
          ...row,
          include: !result[i].duplicate,
          duplicate: result[i].duplicate,
          categoryId: result[i].categoryId ?? '',
          suggested: result[i].categoryId ?? '',
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : m.setup_import_review_failed())
    } finally {
      setPending(false)
    }
  }

  const confirm = async (included: Reviewed[], remember: boolean) => {
    setError(null)
    setPending(true)
    try {
      const { count } = await importTransactions({
        data: {
          spaceId: space.id,
          walletId,
          rows: included,
          fileName,
          layout:
            header && mapping
              ? { header: layoutHeader(header), mapping }
              : undefined,
        },
      })
      const rules = remember ? rulesToRemember(included) : []
      if (rules.length) await saveRules({ data: { spaceId: space.id, rules } })
      await queryClient.invalidateQueries({ queryKey: ['space', space.id] })
      toast.success(m.setup_import_done({ count }))
      await navigate({ to: '/activity' })
    } catch (e) {
      setError(e instanceof Error ? e.message : m.setup_import_failed())
    } finally {
      setPending(false)
    }
  }

  const update = (index: number, change: Partial<Reviewed>) =>
    setReviewed(
      (current) =>
        current?.map((row, i) => (i === index ? { ...row, ...change } : row)) ??
        null,
    )

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/more"
        className="-ml-2 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {m.setup_back_more()}
      </Link>
      <h1 className="font-semibold text-2xl tracking-tight">
        {m.setup_import_title()}
      </h1>
      <p className="max-w-prose text-muted-foreground">
        {m.setup_import_intro()}
      </p>

      <section aria-labelledby="import-file" className="flex flex-col gap-3">
        <h2 id="import-file" className="font-semibold text-lg">
          {m.setup_import_step_file()}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-wallet">
              {m.setup_import_into_wallet()}
            </Label>
            <select
              id="import-wallet"
              className={selectClass}
              value={walletId}
              onChange={(e) => {
                setWalletId(e.target.value)
                setReviewed(null)
              }}
            >
              {options.wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.currency})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-file-input">
              {m.setup_import_csv_file()}
            </Label>
            <Input
              id="import-file-input"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) readFile(file)
              }}
            />
          </div>
        </div>
      </section>

      {header && mapping && (
        <section
          aria-labelledby="import-columns"
          className="flex flex-col gap-3"
        >
          <h2 id="import-columns" className="font-semibold text-lg">
            {m.setup_import_step_columns()}
          </h2>
          {remembered && (
            <p className="text-muted-foreground text-sm" role="status">
              {m.setup_import_remembered()}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <ColumnSelect
              id="map-date"
              label={m.setup_import_column_date()}
              header={header}
              value={mapping.date}
              onChange={(date) => setMapping({ ...mapping, date })}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="map-date-format">
                {m.setup_import_date_format()}
              </Label>
              <select
                id="map-date-format"
                className={selectClass}
                value={mapping.dateFormat}
                onChange={(e) =>
                  setMapping({
                    ...mapping,
                    dateFormat: e.target.value as DateFormat,
                  })
                }
              >
                {DATE_FORMATS.map((format) => (
                  <option key={format}>{format}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={mapping.split}
                onChange={(e) =>
                  setMapping({ ...mapping, split: e.target.checked })
                }
              />
              {m.setup_import_split()}
            </label>
            {mapping.split ? (
              <>
                <ColumnSelect
                  id="map-out"
                  label={m.setup_import_column_out()}
                  header={header}
                  value={mapping.outColumn}
                  onChange={(outColumn) =>
                    setMapping({ ...mapping, outColumn })
                  }
                />
                <ColumnSelect
                  id="map-in"
                  label={m.setup_import_column_in()}
                  header={header}
                  value={mapping.inColumn}
                  onChange={(inColumn) => setMapping({ ...mapping, inColumn })}
                />
              </>
            ) : (
              <ColumnSelect
                id="map-amount"
                label={m.setup_import_column_amount()}
                header={header}
                value={mapping.amount}
                onChange={(amount) => setMapping({ ...mapping, amount })}
              />
            )}
            <ColumnSelect
              id="map-payee"
              label={m.setup_import_column_payee()}
              header={header}
              value={mapping.payee}
              optional
              onChange={(payee) => setMapping({ ...mapping, payee })}
            />
          </div>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {m.setup_import_readable({
              readable: readable.length,
              total: rows.length,
            })}
            {readable.length < rows.length && m.setup_import_unreadable_hint()}
          </p>
          <Button
            className="w-fit"
            disabled={pending || readable.length === 0 || !walletId}
            onClick={review}
          >
            <Upload />
            {m.setup_import_review_button({ count: readable.length })}
          </Button>
        </section>
      )}

      {reviewed && (
        <ReviewStep
          rows={reviewed}
          currency={currency}
          categories={options.categories}
          pending={pending}
          onChange={update}
          onConfirm={confirm}
        />
      )}
      <FormError message={error} />
      <RecentImports spaceId={space.id} />
    </div>
  )
}

// The last imports with an undo, for a file mapped wrongly or imported into the wrong wallet.
function RecentImports({ spaceId }: { spaceId: string }) {
  const queryClient = useQueryClient()
  const { data } = useQuery(importsQuery(spaceId))
  const [confirming, setConfirming] = useState<ImportRecord | null>(null)
  const undo = useMutation({
    mutationFn: (id: string) => undoImport({ data: { spaceId, id } }),
    onSuccess: async ({ count }) => {
      await queryClient.invalidateQueries({ queryKey: ['space', spaceId] })
      toast.success(m.setup_import_undone({ count }))
      setConfirming(null)
    },
    onError: (e) => toast.error(e.message),
  })
  if (!data || data.imports.length === 0) return null

  return (
    <section aria-labelledby="recent-imports" className="flex flex-col gap-3">
      <h2 id="recent-imports" className="font-semibold text-lg">
        {m.setup_import_recent()}
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {data.imports.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">
                {i.fileName ?? m.setup_import_statement()}
              </span>
              <span className="text-muted-foreground text-sm">
                {new Date(i.createdAt).toLocaleDateString(formatLocale(), {
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                {m.setup_import_recent_detail({
                  wallet: i.walletName,
                  remaining: i.remaining,
                  count: i.count,
                })}
              </span>
            </span>
            {data.canWrite && (
              <Button
                variant="outline"
                size="sm"
                aria-label={m.setup_import_undo_label({
                  name: i.fileName ?? m.setup_import_statement(),
                })}
                onClick={() => setConfirming(i)}
              >
                {m.setup_import_undo()}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.setup_import_undo_title()}</DialogTitle>
            <DialogDescription>
              {m.setup_import_undo_description({
                count: confirming?.remaining ?? 0,
                wallet: confirming?.walletName ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              {m.setup_import_keep()}
            </Button>
            <Button
              variant="destructive"
              disabled={undo.isPending}
              onClick={() => confirming && undo.mutate(confirming.id)}
            >
              {m.setup_import_undo_confirm()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function ColumnSelect({
  id,
  label,
  header,
  value,
  optional = false,
  onChange,
}: {
  id: string
  label: string
  header: string[]
  value: number
  optional?: boolean
  onChange: (column: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className={selectClass}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {optional && <option value={-1}>{m.setup_import_column_none()}</option>}
        {header.map((name, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional; names can repeat
          <option key={index} value={index}>
            {name || m.setup_import_column_fallback({ index: index + 1 })}
          </option>
        ))}
      </select>
    </div>
  )
}

function ReviewStep({
  rows,
  currency,
  categories,
  pending,
  onChange,
  onConfirm,
}: {
  rows: Reviewed[]
  currency: string
  categories: {
    id: string
    name: string
    type: string
    parentId: string | null
  }[]
  pending: boolean
  onChange: (index: number, change: Partial<Reviewed>) => void
  onConfirm: (rows: Reviewed[], remember: boolean) => void
}) {
  const [remember, setRemember] = useState(true)
  const included = rows.filter((r) => r.include)
  const learnable = rulesToRemember(included).length
  const missing = included.filter((r) => !r.categoryId).length
  const duplicates = rows.filter((r) => r.duplicate).length

  return (
    <section aria-labelledby="import-review" className="flex flex-col gap-3">
      <h2 id="import-review" className="font-semibold text-lg">
        {m.setup_import_step_review()}
      </h2>
      <p className="text-muted-foreground text-sm">
        {duplicates > 0 &&
          `${m.setup_import_duplicates({ count: duplicates })} `}
        {m.setup_import_categories_hint()}
      </p>
      <ul className="divide-y rounded-lg border bg-card">
        {rows.map((row, index) => {
          const type = row.amount > 0 ? 'income' : 'expense'
          const label = `${row.payee || m.setup_import_no_payee()}, ${formatShortDate(row.date)}`
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id until imported
              key={index}
              className={cn(
                'grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3',
                !row.include && 'bg-muted/40',
              )}
            >
              <input
                type="checkbox"
                aria-label={m.setup_import_row_include({ label })}
                checked={row.include}
                onChange={(e) => onChange(index, { include: e.target.checked })}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">
                  {row.payee || m.setup_import_no_payee()}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  {formatShortDate(row.date)}
                  {row.duplicate && (
                    <>
                      <CopyCheck className="size-3.5" aria-hidden="true" />
                      {m.setup_import_possible_duplicate()}
                    </>
                  )}
                </span>
              </span>
              <span className="font-medium tabular-nums">
                {formatSignedMoney(row.amount, currency)}
              </span>
              <select
                aria-label={m.setup_import_row_category({ label })}
                className={cn(selectClass, 'col-span-2 col-start-2')}
                value={row.categoryId}
                disabled={!row.include}
                onChange={(e) =>
                  onChange(index, { categoryId: e.target.value })
                }
              >
                <option value="">{m.setup_categories_choose()}</option>
                {categoryOrder(categories, type).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? ` ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </li>
          )
        })}
      </ul>
      {missing > 0 && (
        <p className="text-sm" role="status">
          {m.setup_import_missing({ count: missing })}
        </p>
      )}
      {learnable > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          {m.setup_import_remember({ count: learnable })}
        </label>
      )}
      <Button
        size="lg"
        className="w-fit"
        disabled={pending || included.length === 0 || missing > 0}
        onClick={() => onConfirm(included, remember && learnable > 0)}
      >
        {m.setup_import_confirm({ count: included.length })}
      </Button>
    </section>
  )
}
