import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { formatShortDate } from '@/lib/format-date'
import { formatMoney } from '@/lib/money'
import { m } from '@/paraglide/messages.js'
import type { BudgetReport } from '@/server/budgets'

const config = {
  current: { label: 'This month', color: 'var(--note)' },
  previous: { label: 'Last month', color: 'var(--chart-muted)' },
} satisfies ChartConfig

interface Props {
  pace: BudgetReport['pace']
  budget: number | null
  currency: string
  isCurrent: boolean
}

// Cumulative spending through the budget month against last month, aligned by day number.
// This month is the accent, last month the muted reference, the budget a labelled line.
export function SpendingPaceChart({
  pace,
  budget,
  currency,
  isCurrent,
}: Props) {
  const money = (minor: number) => formatMoney(minor, currency)
  const compact = (minor: number) =>
    formatMoney(minor, currency, undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    })
  const lastIndex = pace.findLastIndex((p) => p.current !== null)
  const latest = pace[lastIndex]
  const labels = {
    current: m.ov_pace_this_month(),
    previous: m.ov_pace_last_month(),
  }
  const summary = paceSummary(pace, lastIndex, budget, isCurrent, money)

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-col gap-2">
        <p className="max-w-prose text-sm">{summary}</p>
        <ul
          className="flex gap-4 text-xs text-muted-foreground"
          aria-hidden="true"
        >
          {(['current', 'previous'] as const).map((key) => (
            <li key={key} className="flex items-center gap-1.5">
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: config[key].color }}
              />
              {labels[key]}
            </li>
          ))}
          {budget !== null && (
            <li className="flex items-center gap-1.5">
              <span className="h-px w-4 bg-foreground/50" />
              {m.ov_pace_budget()}
            </li>
          )}
        </ul>
      </figcaption>

      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <LineChart
          data={pace}
          margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            tickMargin={8}
            tickFormatter={(day: number) => formatShortDate(pace[day - 1].date)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={compact}
            domain={[0, (max: number) => Math.max(max, budget ?? 0)]}
          />
          {budget !== null && (
            <ReferenceLine
              y={budget}
              stroke="var(--foreground)"
              strokeOpacity={0.5}
              strokeDasharray="4 4"
              label={{
                value: m.ov_pace_budget_line({ amount: compact(budget) }),
                position: 'insideTopLeft',
                fill: 'var(--muted-foreground)',
                fontSize: 12,
              }}
            />
          )}
          <ChartTooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as
                | (typeof pace)[number]
                | undefined
              if (!active || !point) return null
              return (
                <div className="grid min-w-40 gap-1.5 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">
                    {m.ov_pace_tooltip_day({
                      date: formatShortDate(point.date),
                      day: point.day,
                    })}
                  </p>
                  {(['current', 'previous'] as const).map((key) =>
                    point[key] === null ? null : (
                      <p key={key} className="flex items-center gap-2">
                        <span
                          className="h-0.5 w-3 rounded-full"
                          style={{ backgroundColor: config[key].color }}
                        />
                        <span className="text-muted-foreground">
                          {labels[key]}
                        </span>
                        <span className="ml-auto font-medium">
                          {money(point[key] ?? 0)}
                        </span>
                      </p>
                    ),
                  )}
                </div>
              )
            }}
          />
          <Line
            dataKey="previous"
            type="linear"
            stroke="var(--color-previous)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="current"
            type="linear"
            stroke="var(--color-current)"
            strokeWidth={2}
            isAnimationActive={false}
            dot={(props) =>
              props.index === lastIndex ? (
                <circle
                  key="end"
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill="var(--color-current)"
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ) : (
                <g key={props.index} />
              )
            }
            activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
          />
        </LineChart>
      </ChartContainer>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          {m.ov_chart_show_table()}
        </summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-normal">{m.ov_chart_day()}</th>
              <th className="py-1 text-right font-normal">{labels.current}</th>
              <th className="py-1 text-right font-normal">{labels.previous}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {pace.map((p) => (
              <tr key={p.day} className="border-t">
                <td className="py-1">{formatShortDate(p.date)}</td>
                <td className="py-1 text-right">
                  {p.current === null ? '' : money(p.current)}
                </td>
                <td className="py-1 text-right">{money(p.previous)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      {latest === undefined && (
        <p className="text-sm text-muted-foreground">{m.ov_pace_empty()}</p>
      )}
    </figure>
  )
}

function paceSummary(
  pace: BudgetReport['pace'],
  lastIndex: number,
  budget: number | null,
  isCurrent: boolean,
  money: (minor: number) => string,
) {
  const latest = pace[lastIndex]
  if (!latest || latest.current === null) return m.ov_pace_nothing_spent()
  const difference = latest.current - latest.previous
  const values = {
    spent: money(latest.current),
    difference: money(Math.abs(difference)),
  }
  if (!isCurrent) {
    return difference >= 0
      ? m.ov_pace_past_more(values)
      : m.ov_pace_past_less(values)
  }
  let projection = ''
  // Recurring payments land on the same days each month, so the rest of last month is a
  // better guide than a straight line from the first days.
  if (latest.day >= 5 && latest.day < pace.length) {
    const lastMonthRest = (pace.at(-1)?.previous ?? 0) - latest.previous
    const projected = latest.current + lastMonthRest
    projection = ` ${
      budget === null
        ? m.ov_pace_projection_end({ amount: money(projected) })
        : projected > budget
          ? m.ov_pace_projection_over({ amount: money(projected - budget) })
          : m.ov_pace_projection_under({ amount: money(budget - projected) })
    }`
  }
  const sofar = { spent: values.spent, day: latest.day }
  const comparison =
    difference === 0
      ? m.ov_pace_current_same(sofar)
      : difference > 0
        ? m.ov_pace_current_more({ ...sofar, difference: values.difference })
        : m.ov_pace_current_less({ ...sofar, difference: values.difference })
  return `${comparison}${projection}`
}
