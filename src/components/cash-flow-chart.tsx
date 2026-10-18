import { Link, useNavigate } from '@tanstack/react-router'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { formatMoney, formatSignedMoney } from '@/lib/money'
import type { CashFlow } from '@/server/reports'

const config = {
  income: { label: 'Income', color: 'var(--income)' },
  expense: { label: 'Spending', color: 'var(--foreground)' },
} satisfies ChartConfig

const monthLabel = (start: string, startDay: boolean) =>
  new Date(`${start}T00:00:00Z`).toLocaleDateString('en-IE', {
    month: 'short',
    // Months that start mid-month are named after the day they start.
    day: startDay ? 'numeric' : undefined,
    timeZone: 'UTC',
  })

// Income above the axis, spending below, one pair of bars per budget month. A bar opens
// that month in Activity; the table below does the same for keyboard and screen readers.
export function CashFlowChart({ months, currency }: CashFlow) {
  const navigate = useNavigate()
  const money = (minor: number) => formatMoney(minor, currency)
  const compact = (minor: number) =>
    formatMoney(minor, currency, undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    })
  const midMonth = !months[0]?.start.endsWith('-01')
  const data = months.map((m) => ({
    ...m,
    label: monthLabel(m.start, midMonth),
    spending: -m.expense,
  }))
  const openMonth = (month: { start: string; end: string }) =>
    navigate({ to: '/activity', search: { from: month.start, to: month.end } })

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-col gap-2">
        <p className="max-w-prose text-sm">{summary(months, money)}</p>
        <ul
          className="flex gap-4 text-muted-foreground text-xs"
          aria-hidden="true"
        >
          {(['income', 'expense'] as const).map((key) => (
            <li key={key} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: config[key].color }}
              />
              {config[key].label}
            </li>
          ))}
        </ul>
      </figcaption>

      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <BarChart
          data={data}
          stackOffset="sign"
          margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(value: number) => compact(Math.abs(value))}
          />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" />
          <ChartTooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
            content={({ active, payload }) => {
              const month = payload?.[0]?.payload as
                | (typeof data)[number]
                | undefined
              if (!active || !month) return null
              return (
                <div className="grid min-w-44 gap-1.5 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">{month.label}</p>
                  <Row
                    color={config.income.color}
                    label="Income"
                    value={money(month.income)}
                  />
                  <Row
                    color={config.expense.color}
                    label="Spending"
                    value={money(month.expense)}
                  />
                  <p className="flex justify-between gap-2 border-t pt-1.5">
                    <span className="text-muted-foreground">Saved</span>
                    <span className="font-medium">
                      {formatSignedMoney(month.net, currency)}
                    </span>
                  </p>
                </div>
              )
            }}
          />
          <Bar
            dataKey="income"
            stackId="flow"
            fill="var(--color-income)"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            className="cursor-pointer"
            onClick={(entry) => openMonth(entry.payload)}
          />
          <Bar
            dataKey="spending"
            stackId="flow"
            fill="var(--color-expense)"
            fillOpacity={0.75}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            className="cursor-pointer"
            onClick={(entry) => openMonth(entry.payload)}
          />
        </BarChart>
      </ChartContainer>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          Show as table
        </summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-normal">Month</th>
              <th className="py-1 text-right font-normal">Income</th>
              <th className="py-1 text-right font-normal">Spending</th>
              <th className="py-1 text-right font-normal">Saved</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {data.map((m) => (
              <tr key={m.start} className="border-t">
                <td className="py-1">
                  <Link
                    to="/activity"
                    search={{ from: m.start, to: m.end }}
                    className="underline underline-offset-4"
                  >
                    {m.label}
                  </Link>
                </td>
                <td className="py-1 text-right">{money(m.income)}</td>
                <td className="py-1 text-right">{money(m.expense)}</td>
                <td className="py-1 text-right">
                  {formatSignedMoney(m.net, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

function Row({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <p className="flex items-center gap-2">
      <span className="size-2 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </p>
  )
}

function summary(months: CashFlow['months'], money: (minor: number) => string) {
  // The current month is still running, so the year is judged on complete months.
  const complete = months.slice(0, -1).filter((m) => m.income || m.expense)
  if (complete.length === 0) return 'Not enough history yet for a yearly view.'
  const income = complete.reduce((s, m) => s + m.income, 0)
  const expense = complete.reduce((s, m) => s + m.expense, 0)
  const saved = income - expense
  const rate = income > 0 ? Math.round((saved / income) * 100) : 0
  const best = complete.reduce((a, b) => (b.net > a.net ? b : a))
  const worst = complete.reduce((a, b) => (b.net < a.net ? b : a))
  const name = (m: { start: string }) => {
    const date = new Date(`${m.start}T00:00:00Z`)
    const month = date.toLocaleDateString('en-IE', {
      month: 'long',
      timeZone: 'UTC',
    })
    // Budget months that start mid-month are named by their first day.
    return m.start.endsWith('-01')
      ? month
      : `the month from ${date.getUTCDate()} ${month}`
  }
  const savedText =
    saved >= 0
      ? `saving ${money(saved)} (${rate} % of income)`
      : `spending ${money(-saved)} more than came in`
  return `In the last ${complete.length} complete months you earned ${money(income)} and spent ${money(expense)}, ${savedText}. Best month: ${name(best)}; tightest: ${name(worst)}.`
}
