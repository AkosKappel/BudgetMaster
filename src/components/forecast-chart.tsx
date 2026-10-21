import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
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
import { formatMoney, formatSignedMoney } from '@/lib/money'
import { m } from '@/paraglide/messages.js'
import type { Forecast } from '@/server/reports'

const config = {
  balance: { label: 'Balance', color: 'var(--note)' },
} satisfies ChartConfig

function summary(
  { points, lowest, events }: Forecast,
  money: (n: number) => string,
) {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last) return m.ov_forecast_no_wallets()
  if (events.length === 0)
    return m.ov_forecast_no_payments({ balance: money(first.balance) })
  const end = {
    end: money(last.balance),
    endDate: formatShortDate(last.date),
  }
  if (lowest.balance < 0)
    return m.ov_forecast_below_zero({
      date: formatShortDate(lowest.date),
      lowest: money(lowest.balance),
      ...end,
    })
  if (lowest.date === first.date)
    return m.ov_forecast_never_lower({ balance: money(first.balance), ...end })
  return m.ov_forecast_tightest({
    date: formatShortDate(lowest.date),
    lowest: money(lowest.balance),
    ...end,
  })
}

// Today's balance carried forward with the payments that are already known.
export function ForecastChart(props: Forecast) {
  const { points, lowest, events, currency } = props
  const money = (minor: number) => formatMoney(minor, currency)
  const compact = (minor: number) =>
    formatMoney(minor, currency, undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    })
  let running = points[0]?.balance ?? 0
  const rows = events.map((e) => {
    running += e.change
    return { ...e, balance: running }
  })

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="max-w-prose text-sm">
        {summary(props, money)}
      </figcaption>
      <ChartContainer config={config} className="aspect-auto h-48 w-full">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 28, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={formatShortDate}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={compact}
            domain={['auto', 'auto']}
          />
          {lowest.balance < 0 && (
            <ReferenceLine
              y={0}
              stroke="var(--destructive)"
              strokeDasharray="4 4"
            />
          )}
          <ChartTooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as
                | Forecast['points'][number]
                | undefined
              if (!active || !point) return null
              const today = events.filter((e) => e.date === point.date)
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">{formatShortDate(point.date)}</p>
                  <p>{money(point.balance)}</p>
                  {today.map((e) => (
                    <p key={e.id} className="text-muted-foreground">
                      {e.label} {formatSignedMoney(e.change, currency)}
                    </p>
                  ))}
                </div>
              )
            }}
          />
          <Area
            dataKey="balance"
            type="stepAfter"
            stroke="var(--color-balance)"
            strokeWidth={2}
            fill="var(--color-balance)"
            fillOpacity={0.12}
            isAnimationActive={false}
          />
          {events.length > 0 && (
            <ReferenceDot
              x={lowest.date}
              y={lowest.balance}
              r={4}
              fill={
                lowest.balance < 0
                  ? 'var(--destructive)'
                  : 'var(--color-balance)'
              }
              stroke="var(--card)"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ChartContainer>
      {rows.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            {m.ov_forecast_show_payments()}
          </summary>
          <table className="mt-2 w-full text-left">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">{m.ov_chart_date()}</th>
                <th className="py-1 font-normal">{m.ov_forecast_payment()}</th>
                <th className="py-1 text-right font-normal">
                  {m.ov_chart_amount()}
                </th>
                <th className="py-1 text-right font-normal">
                  {m.ov_forecast_balance()}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="whitespace-nowrap py-1 pr-2">
                    {formatShortDate(r.date)}
                  </td>
                  <td className="py-1 pr-2">{r.label}</td>
                  <td className="whitespace-nowrap py-1 text-right">
                    {formatSignedMoney(r.change, currency)}
                  </td>
                  <td className="whitespace-nowrap py-1 text-right">
                    {money(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  )
}
