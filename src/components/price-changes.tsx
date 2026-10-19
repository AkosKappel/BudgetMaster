import { formatMoney } from '@/lib/money'
import type { PriceChanges as Changes } from '@/server/reports'

const signed = (percent: number) =>
  percent === 0
    ? 'no change'
    : `${percent > 0 ? '+' : '−'}${Math.abs(percent)} %`

// What the same shops and bills charge recent against a year ago, biggest moves first.
export function PriceChanges({ payees, inflation, currency }: Changes) {
  const money = (minor: number) => formatMoney(minor, currency)
  if (inflation === null)
    return (
      <p className="text-muted-foreground text-sm">
        Not enough history yet: this needs payees you paid at least twice in the
        last three months and twice in the same months a year ago.
      </p>
    )

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-prose text-sm">
        {inflation === 0
          ? `What you pay at ${payees.length} regular payees has not changed in a year.`
          : `What you pay at ${payees.length} regular payees ${inflation > 0 ? 'rose' : 'fell'} by ${Math.abs(inflation)} % in a year: your personal inflation rate.`}
      </p>
      <ul className="divide-y rounded-lg border bg-card">
        {payees.slice(0, 8).map((p) => (
          <li key={p.payee} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1 truncate">{p.payee}</span>
            <span className="text-muted-foreground text-sm">
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
