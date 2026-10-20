import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { formatShortDate } from '@/lib/format-date'
import { formatMoney, formatSignedMoney } from '@/lib/money'
import { m } from '@/paraglide/messages.js'
import type { NetWorth } from '@/server/reports'

const config = {
  balance: { label: 'Net worth', color: 'var(--note)' },
} satisfies ChartConfig

// Every wallet added up in the space currency, at the end of each budget month.
export function NetWorthChart({ points, currency }: NetWorth) {
  const money = (minor: number) => formatMoney(minor, currency)
  const compact = (minor: number) =>
    formatMoney(minor, currency, undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    })
  const first = points[0]
  const last = points.at(-1)
  const change = last && first ? last.balance - first.balance : 0
  const summary = last
    ? m.ov_networth_summary({
        balance: money(last.balance),
        change: formatSignedMoney(change, currency),
        date: formatShortDate(first.date),
      })
    : m.ov_networth_empty()

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="max-w-prose text-sm">{summary}</figcaption>
      <ChartContainer config={config} className="aspect-auto h-48 w-full">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={formatShortDate}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={compact}
            domain={['auto', 'auto']}
          />
          <ChartTooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as
                | NetWorth['points'][number]
                | undefined
              if (!active || !point) return null
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">{formatShortDate(point.date)}</p>
                  <p>{money(point.balance)}</p>
                </div>
              )
            }}
          />
          <Area
            dataKey="balance"
            type="linear"
            stroke="var(--color-balance)"
            strokeWidth={2}
            fill="var(--color-balance)"
            fillOpacity={0.12}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          {m.ov_chart_show_table()}
        </summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-normal">{m.ov_chart_date()}</th>
              <th className="py-1 text-right font-normal">
                {m.ov_networth_title()}
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {points.map((p) => (
              <tr key={p.date} className="border-t">
                <td className="py-1">{formatShortDate(p.date)}</td>
                <td className="py-1 text-right">{money(p.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
