import { CircleAlert, TriangleAlert } from 'lucide-react'

import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'

// From this share of the limit on, a budget counts as close.
const WARNING_AT = 0.8

export function budgetStatus(spent: number, limit: number) {
  if (spent > limit) return 'over' as const
  if (spent >= limit * WARNING_AT) return 'close' as const
  return 'ok' as const
}

// The fill carries the state (accent, warning, danger); the state is also written out with
// an icon, never colour alone.
export function BudgetMeter({
  spent,
  limit,
  currency,
  daysLeft,
}: {
  spent: number
  limit: number
  currency: string
  // Shown as "x a day" for the current month.
  daysLeft?: number
}) {
  const status = budgetStatus(spent, limit)
  const used = Math.min(100, (spent / limit) * 100)
  const left = limit - spent
  const money = (minor: number) => formatMoney(minor, currency)

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label={m.ov_meter_label()}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((spent / limit) * 100)}
        aria-valuetext={m.ov_meter_value({
          spent: money(spent),
          limit: money(limit),
        })}
        className={cn(
          'h-2 overflow-hidden rounded-full',
          status === 'ok' && 'bg-note/15',
          status === 'close' && 'bg-warning/20',
          status === 'over' && 'bg-destructive/20',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full',
            status === 'ok' && 'bg-note',
            status === 'close' && 'bg-warning',
            status === 'over' && 'bg-destructive',
          )}
          style={{ width: `${used}%` }}
        />
      </div>
      <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        {status === 'over' && (
          <CircleAlert className="size-4 text-destructive" aria-hidden="true" />
        )}
        {status === 'close' && (
          <TriangleAlert className="size-4 text-warning" aria-hidden="true" />
        )}
        <span className={cn(status !== 'ok' && 'font-medium text-foreground')}>
          {status === 'over'
            ? m.ov_meter_over({ amount: money(-left) })
            : status === 'close'
              ? m.ov_meter_close({ amount: money(left) })
              : m.ov_meter_left({ amount: money(left) })}
        </span>
        <span>
          {daysLeft && left > 0
            ? m.ov_meter_of_daily({
                limit: money(limit),
                daily: money(Math.floor(left / daysLeft)),
              })
            : m.ov_meter_of({ limit: money(limit) })}
        </span>
      </p>
    </div>
  )
}
