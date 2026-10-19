import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { formatShortDate } from '@/lib/format-date'
import { APP_LOCALE, formatMoney } from '@/lib/money'
import { useActiveSpace, yearReviewQuery } from '@/lib/queries'
import { currentDay } from '@/lib/today'
import { cn } from '@/lib/utils'
import type { YearReviewData } from '@/server/reports'

// "Your year in money" (I-14): a few cards about one calendar year, defaulting to this year
// so far. Sharing sends a sentence without amounts.
export const Route = createFileRoute('/_app/year-in-review')({
  validateSearch: z.object({
    year: z.int().min(2000).max(2100).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ year: search.year }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      yearReviewQuery(
        context.activeSpaceId,
        deps.year ?? Number(currentDay().slice(0, 4)),
      ),
    ),
  head: () => ({ meta: [{ title: 'Year in review | BudgetMaster' }] }),
  component: YearInReview,
})

const monthName = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString(APP_LOCALE, {
    month: 'long',
    timeZone: 'UTC',
  })

function shareText(r: YearReviewData) {
  const parts = [
    `${r.noSpendDays} days without spending`,
    r.savingRate !== null && r.savingRate > 0
      ? `${r.savingRate} % of my income saved`
      : null,
    r.topCategory ? `most of it went to ${r.topCategory.name}` : null,
  ].filter(Boolean)
  return `My ${r.year} in BudgetMaster: ${parts.join(', ')}.`
}

function YearInReview() {
  const space = useActiveSpace()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const year = search.year ?? Number(currentDay().slice(0, 4))
  const { data: r } = useQuery({
    ...yearReviewQuery(space.id, year),
    placeholderData: keepPreviousData,
  })
  if (!r) return null
  const money = (minor: number) => formatMoney(minor, r.currency)

  const cards: { label: string; value: string; detail?: string }[] = [
    {
      label: r.saved >= 0 ? 'Saved' : 'Spent more than earned',
      value: money(Math.abs(r.saved)),
      detail:
        r.savingRate !== null
          ? `${r.savingRate} % of ${money(r.income)} income`
          : 'No income recorded',
    },
    {
      label: 'Days without spending',
      value: String(r.noSpendDays),
      detail: `of ${r.days} days${r.complete ? '' : ' so far'}`,
    },
    ...(r.topCategory
      ? [
          {
            label: 'Most went to',
            value: r.topCategory.name,
            detail: `${money(r.topCategory.total)}, ${Math.round((r.topCategory.total / r.spent) * 100)} % of spending`,
          },
        ]
      : []),
    ...(r.topPayee
      ? [
          {
            label: 'Paid most to',
            value: r.topPayee.name,
            detail: `${money(r.topPayee.total)} in ${r.topPayee.count} payments`,
          },
        ]
      : []),
    ...(r.priciestMonth
      ? [
          {
            label: 'Most expensive month',
            value: monthName(r.priciestMonth.month),
            detail: money(r.priciestMonth.total),
          },
        ]
      : []),
    ...(r.biggest
      ? [
          {
            label: 'Biggest single expense',
            value: money(r.biggest.amount),
            detail: `${r.biggest.payee ?? 'An expense'}, ${formatShortDate(r.biggest.date)}`,
          },
        ]
      : []),
  ]

  const share = async () => {
    const text = shareText(r)
    if (navigator.canShare?.({ text })) {
      await navigator.share({ text }).catch(() => undefined)
      return
    }
    await navigator.clipboard.writeText(text)
    toast.success('Copied to share')
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/reports"
        className="-ml-2 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Reports
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-semibold text-2xl tracking-tight">
          {r.year} in money
        </h1>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="review-year">
            Year
          </label>
          <select
            id="review-year"
            className="h-9 rounded-md border border-input bg-card px-3 text-sm shadow-xs"
            value={year}
            onChange={(e) =>
              navigate({
                to: '/year-in-review',
                search: { year: Number(e.target.value) },
              })
            }
          >
            {r.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={share}>
            <Share2 />
            Share
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">
        {r.transactions} transactions
        {r.complete ? '' : ' so far this year'}, in {r.currency}. Sharing sends
        a sentence without amounts.
      </p>

      {r.transactions === 0 ? (
        <p className="text-muted-foreground">Nothing recorded in {r.year}.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map((c, i) => (
            <li
              key={c.label}
              className={cn(
                'flex min-h-32 flex-col justify-between gap-3 rounded-xl border bg-card p-5',
                i === 0 && 'border-note/40 sm:col-span-2',
              )}
            >
              <span className="text-muted-foreground text-sm">{c.label}</span>
              <span
                className={cn(
                  'font-semibold tracking-tight',
                  i === 0 ? 'text-4xl' : 'text-2xl',
                )}
              >
                {c.value}
              </span>
              {c.detail && (
                <span className="text-muted-foreground text-sm">
                  {c.detail}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
