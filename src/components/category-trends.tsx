import { formatMoney } from '@/lib/money'
import { m } from '@/paraglide/messages.js'
import type { CategoryTrends as Trends } from '@/server/reports'

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const width = 80
  const height = 24
  const max = Math.max(...values, 1)
  const points = values.map((value, i) => [
    (i / (values.length - 1)) * (width - 4) + 2,
    height - 2 - (value / max) * (height - 4),
  ])
  const [lastX, lastY] = points.at(-1) ?? [0, 0]
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-6 w-20 shrink-0"
      aria-hidden="true"
    >
      <polyline
        points={points.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  )
}

// Spending per category over the last complete months, with last month against the
// average of the months before it. The current month is left out: it is not over yet.
export function CategoryTrends({ categories, currency }: Trends) {
  const money = (minor: number) => formatMoney(minor, currency)
  const rows = categories
    .filter((c) => c.type === 'expense')
    .map((c) => {
      const complete = c.totals.slice(0, -1)
      const last = complete.at(-1) ?? 0
      const before = complete.slice(0, -1)
      const average = before.reduce((s, t) => s + t, 0) / (before.length || 1)
      const change =
        average > 0 ? Math.round(((last - average) / average) * 100) : null
      return { ...c, complete, last, change }
    })

  if (rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground">{m.ov_trends_empty()}</p>
    )

  return (
    <ul className="divide-y rounded-lg border bg-card">
      {rows.map((c) => (
        <li key={c.id} className="flex items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1 truncate">{c.name}</span>
          <Sparkline values={c.complete} color={c.color} />
          <span className="flex w-28 flex-col items-end">
            <span className="font-medium tabular-nums">{money(c.last)}</span>
            <span className="text-xs text-muted-foreground">
              {c.change === null
                ? m.ov_trends_new()
                : c.change === 0
                  ? m.ov_trends_as_usual()
                  : m.ov_trends_vs_usual({
                      change: `${c.change > 0 ? '+' : '−'}${Math.abs(c.change)}`,
                    })}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
