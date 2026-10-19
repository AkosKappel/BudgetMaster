import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { formatShortDate } from '@/lib/format-date'
import { formatMoney, formatSignedMoney } from '@/lib/money'
import { budgetReportQuery, useActiveSpace } from '@/lib/queries'
import type { BudgetReport } from '@/server/budgets'

// One budget month on one page, to read or print (PDF via the browser's print dialog).
// `?month=-1` (the default) is the last complete month; the previous one is loaded too
// for the comparison, so the oldest month is one newer than the budget page allows.
export const Route = createFileRoute('/_app/monthly-report')({
  validateSearch: z.object({
    month: z.int().min(-35).max(0).catch(-1).default(-1),
  }),
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        budgetReportQuery(context.activeSpaceId, deps.month),
      ),
      context.queryClient.ensureQueryData(
        budgetReportQuery(context.activeSpaceId, deps.month - 1),
      ),
    ]),
  head: () => ({ meta: [{ title: 'Monthly report | BudgetMaster' }] }),
  component: MonthlyReport,
})

const percent = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0

// Top-level categories whose spending moved the most against the month before.
function biggestChanges(report: BudgetReport, before: BudgetReport) {
  const ids = new Set([
    ...report.breakdown.map((c) => c.id),
    ...before.breakdown.map((c) => c.id),
  ])
  return [...ids]
    .map((id) => {
      const now = report.breakdown.find((c) => c.id === id)
      const previous = before.breakdown.find((c) => c.id === id)
      return {
        id,
        name: now?.name ?? previous?.name ?? '',
        now: now?.total ?? 0,
        before: previous?.total ?? 0,
        change: (now?.total ?? 0) - (previous?.total ?? 0),
      }
    })
    .filter((c) => c.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3)
}

function MonthlyReport() {
  const space = useActiveSpace()
  const { month } = Route.useSearch()
  const { data: report } = useSuspenseQuery(budgetReportQuery(space.id, month))
  const { data: before } = useSuspenseQuery(
    budgetReportQuery(space.id, month - 1),
  )
  const money = (minor: number) => formatMoney(minor, report.currency)
  const saved = report.income - report.spent
  const period = `${formatShortDate(report.period.start)} – ${formatShortDate(report.period.end)}`
  const top = report.breakdown.slice(0, 5)
  const changes = biggestChanges(report, before)
  const overBudget = report.categoryBudgets.filter((b) => b.spent > b.amount)

  return (
    <article className="flex flex-col gap-8 print:gap-6">
      <div className="flex flex-col gap-3 print:hidden">
        <Link
          to="/reports"
          className="-ml-2 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-sm hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Reports
        </Link>
        <nav aria-label="Report month" className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild={month > -35}>
            {month > -35 ? (
              <Link
                to="/monthly-report"
                search={{ month: month - 1 }}
                aria-label="Previous month"
              >
                <ChevronLeft />
              </Link>
            ) : (
              <ChevronLeft />
            )}
          </Button>
          <p className="min-w-0 flex-1 text-center font-medium">{period}</p>
          <Button
            variant="ghost"
            size="icon"
            asChild={month < 0}
            disabled={month >= 0}
            aria-label="Next month"
          >
            {month < 0 ? (
              <Link to="/monthly-report" search={{ month: month + 1 }}>
                <ChevronRight />
              </Link>
            ) : (
              <ChevronRight />
            )}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
        </nav>
      </div>

      <header>
        <p className="text-muted-foreground text-sm">
          {space.name}
          {report.isCurrent ? ', month so far' : ''}
        </p>
        <h1 className="font-semibold text-2xl tracking-tight">
          Monthly report, {period}
        </h1>
      </header>

      <section aria-labelledby="totals" className="flex flex-col gap-3">
        <h2 id="totals" className="font-semibold text-lg">
          Totals
        </h2>
        <dl className="grid grid-cols-3 gap-3 rounded-lg border bg-card p-4 print:break-inside-avoid">
          <div>
            <dt className="text-muted-foreground text-sm">Income</dt>
            <dd className="font-semibold text-lg">{money(report.income)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Spent</dt>
            <dd className="font-semibold text-lg">{money(report.spent)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">
              {saved >= 0 ? 'Saved' : 'Overspent'}
            </dt>
            <dd className="font-semibold text-lg">{money(Math.abs(saved))}</dd>
          </div>
        </dl>
        <p className="text-sm">
          {report.income > 0
            ? `You kept ${percent(saved, report.income)} % of your income.`
            : 'No income this month.'}{' '}
          Spending was{' '}
          {formatSignedMoney(report.spent - before.spent, report.currency)}{' '}
          against the month before ({money(before.spent)}).
          {report.overall &&
            ` The overall budget of ${money(report.overall.amount)} was ${
              report.spent > report.overall.amount
                ? `exceeded by ${money(report.spent - report.overall.amount)}`
                : `kept with ${money(report.overall.amount - report.spent)} left`
            }.`}
        </p>
      </section>

      <section aria-labelledby="top" className="flex flex-col gap-3">
        <h2 id="top" className="font-semibold text-lg">
          Top categories
        </h2>
        {top.length === 0 ? (
          <p className="text-muted-foreground text-sm">No spending.</p>
        ) : (
          <table className="w-full text-left text-sm print:break-inside-avoid">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">Category</th>
                <th className="py-1 text-right font-normal">Spent</th>
                <th className="py-1 text-right font-normal">Share</th>
              </tr>
            </thead>
            <tbody>
              {top.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-1.5">{c.name}</td>
                  <td className="py-1.5 text-right">{money(c.total)}</td>
                  <td className="py-1.5 text-right">
                    {percent(c.total, report.spent)} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {report.categoryBudgets.length > 0 && (
        <section aria-labelledby="budgets" className="flex flex-col gap-3">
          <h2 id="budgets" className="font-semibold text-lg">
            Budgets
          </h2>
          <p className="text-sm">
            {overBudget.length === 0
              ? `All ${report.categoryBudgets.length} category budgets were kept.`
              : `${overBudget.length} of ${report.categoryBudgets.length} category budgets went over: ${overBudget.map((b) => b.name).join(', ')}.`}
          </p>
          <table className="w-full text-left text-sm print:break-inside-avoid">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">Category</th>
                <th className="py-1 text-right font-normal">Limit</th>
                <th className="py-1 text-right font-normal">Spent</th>
                <th className="py-1 text-right font-normal">Result</th>
              </tr>
            </thead>
            <tbody>
              {report.categoryBudgets.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="py-1.5">{b.name}</td>
                  <td className="py-1.5 text-right">{money(b.amount)}</td>
                  <td className="py-1.5 text-right">{money(b.spent)}</td>
                  <td
                    className={
                      b.spent > b.amount
                        ? 'py-1.5 text-right text-destructive'
                        : 'py-1.5 text-right'
                    }
                  >
                    {b.spent > b.amount
                      ? `${money(b.spent - b.amount)} over`
                      : `${money(b.amount - b.spent)} left`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section aria-labelledby="changes" className="flex flex-col gap-3">
        <h2 id="changes" className="font-semibold text-lg">
          Biggest changes
        </h2>
        {changes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Spending looked the same as the month before.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {changes.map((c) => (
              <li key={c.id}>
                <span className="font-medium">{c.name}</span>:{' '}
                {formatSignedMoney(c.change, report.currency)} (
                {money(c.before)} → {money(c.now)})
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  )
}
