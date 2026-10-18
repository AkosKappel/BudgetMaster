import { Layer, Rectangle, ResponsiveContainer, Sankey } from 'recharts'

import { formatShortDate } from '@/lib/format-date'
import { formatMoney } from '@/lib/money'
import type { CategoryTrends } from '@/server/reports'

interface FlowNode {
  name: string
  color: string
}

// Where last month's money came from and went: income categories into one pool, the pool
// into spending categories and savings (or savings into the pool when spending was higher).
export function MoneyFlow({ periods, categories, currency }: CategoryTrends) {
  const money = (minor: number) => formatMoney(minor, currency)
  const index = periods.length - 2
  const period = periods[index]
  const amountOf = (c: (typeof categories)[number]) => c.totals[index] ?? 0
  const incomes = categories.filter(
    (c) => c.type === 'income' && amountOf(c) > 0,
  )
  const expenses = categories.filter(
    (c) => c.type === 'expense' && amountOf(c) > 0,
  )
  const earned = incomes.reduce((s, c) => s + amountOf(c), 0)
  const spent = expenses.reduce((s, c) => s + amountOf(c), 0)
  if (!period || earned + spent === 0)
    return (
      <p className="text-muted-foreground text-sm">No complete month yet.</p>
    )

  const nodes: FlowNode[] = [
    ...incomes.map((c) => ({ name: c.name, color: 'var(--income)' })),
    { name: 'Budget', color: 'var(--note)' },
    ...expenses.map((c) => ({ name: c.name, color: c.color })),
  ]
  const pool = incomes.length
  const links = [
    ...incomes.map((c, i) => ({ source: i, target: pool, value: amountOf(c) })),
    ...expenses.map((c, i) => ({
      source: pool,
      target: pool + 1 + i,
      value: amountOf(c),
    })),
  ]
  const saved = earned - spent
  if (saved > 0) {
    nodes.push({ name: 'Saved', color: 'var(--income)' })
    links.push({ source: pool, target: nodes.length - 1, value: saved })
  } else if (saved < 0) {
    nodes.push({ name: 'From savings', color: 'var(--destructive)' })
    links.push({ source: nodes.length - 1, target: pool, value: -saved })
  }
  const label = `${formatShortDate(period.start)} to ${formatShortDate(period.end)}`

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="max-w-prose text-sm">
        {label}: {money(earned)} came in and {money(spent)} went out
        {saved >= 0
          ? `, ${money(saved)} saved.`
          : `, ${money(-saved)} more than came in.`}{' '}
        The biggest outflow was{' '}
        {[...expenses].sort((a, b) => amountOf(b) - amountOf(a))[0]?.name ??
          'nothing'}
        .
      </figcaption>
      <div className="h-96 w-full" aria-hidden="true">
        <ResponsiveContainer>
          <Sankey
            data={{ nodes, links }}
            nodePadding={18}
            nodeWidth={10}
            margin={{ top: 8, right: 96, bottom: 8, left: 8 }}
            link={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.25 }}
            node={({ x, y, width, height, index: i, payload }) => (
              <Layer key={`node-${i}`}>
                <Rectangle
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={nodes[i]?.color}
                  radius={2}
                />
                <text
                  x={x + width + 6}
                  y={y + height / 2}
                  dominantBaseline="middle"
                  fontSize={12}
                  fill="var(--foreground)"
                >
                  {payload.name}
                </text>
              </Layer>
            )}
          />
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          Show as table
        </summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-normal">From</th>
              <th className="py-1 font-normal">To</th>
              <th className="py-1 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {links.map((l) => (
              <tr key={`${l.source}-${l.target}`} className="border-t">
                <td className="py-1">{nodes[l.source].name}</td>
                <td className="py-1">{nodes[l.target].name}</td>
                <td className="py-1 text-right">{money(l.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
