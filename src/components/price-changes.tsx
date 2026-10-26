import { formatMoney } from '@/lib/money'
import { m } from '@/paraglide/messages.js'
import type { PriceChanges as Changes } from '@/server/reports'

const signed = (percent: number) =>
  percent === 0
    ? m.ov_prices_no_change()
    : `${percent > 0 ? '+' : '−'}${Math.abs(percent)} %`

// What the same shops and bills charge recent against a year ago, biggest moves first.
export function PriceChanges({ payees, inflation, currency }: Changes) {
  const money = (minor: number) => formatMoney(minor, currency)
  if (inflation === null)
    return (
      <p className="text-sm text-muted-foreground">
        {m.ov_prices_not_enough()}
      </p>
    )

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-prose text-sm">
        {inflation === 0
          ? m.ov_prices_unchanged({ count: payees.length })
          : (inflation > 0 ? m.ov_prices_rose : m.ov_prices_fell)({
              count: payees.length,
              percent: Math.abs(inflation),
            })}
      </p>
      <ul className="divide-y rounded-lg border bg-card">
        {payees.slice(0, 8).map((p) => (
          <li key={p.payee} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1 truncate">{p.payee}</span>
            <span className="text-sm text-muted-foreground">
              {money(p.before)} → {money(p.recent)}
            </span>
            <span className="w-24 text-right font-medium">
              {signed(p.change)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
