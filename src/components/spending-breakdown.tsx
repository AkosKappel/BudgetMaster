import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { iconFor } from '@/lib/icons'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import type { BudgetReport } from '@/server/budgets'

// One series, so one colour: bar length is the only encoding, the value sits at the tip.
// Groups with subcategories expand to show them.
export function SpendingBreakdown({
  breakdown,
  total,
  currency,
}: {
  breakdown: BudgetReport['breakdown']
  total: number
  currency: string
}) {
  const [open, setOpen] = useState<string | null>(null)
  const max = breakdown[0]?.total ?? 0
  if (breakdown.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{m.ov_breakdown_empty()}</p>
    )
  }
  const share = (value: number) =>
    total ? `${Math.round((value / total) * 100)} %` : ''

  return (
    <ul className="flex flex-col gap-1">
      {breakdown.map((row) => {
        const Icon = iconFor(row.icon)
        const expandable = row.children.length > 0
        const isOpen = open === row.id
        const content = (
          <>
            <span className="flex items-center gap-2">
              <Icon
                className="size-4 shrink-0"
                style={{ color: row.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-left">
                {row.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {share(row.total)}
              </span>
              {expandable && (
                <ChevronDown
                  className={cn(
                    'size-4 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              )}
            </span>
            <Bar
              value={row.total}
              max={max}
              label={formatMoney(row.total, currency)}
            />
          </>
        )
        return (
          <li key={row.id}>
            {expandable ? (
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : row.id)}
                className="flex w-full flex-col gap-1.5 rounded-md px-2 py-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                {content}
              </button>
            ) : (
              <div className="flex flex-col gap-1.5 px-2 py-2">{content}</div>
            )}
            {expandable && isOpen && (
              <ul className="mb-2 ml-8 flex flex-col gap-2 border-l pl-3">
                {row.children.map((child) => (
                  <li key={child.id} className="flex flex-col gap-1">
                    <span className="flex text-sm">
                      <span className="flex-1 truncate">{child.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {share(child.total)}
                      </span>
                    </span>
                    <Bar
                      value={child.total}
                      max={max}
                      label={formatMoney(child.total, currency)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Bar({
  value,
  max,
  label,
}: {
  value: number
  max: number
  label: string
}) {
  const width = max ? Math.max(1, (value / max) * 100) : 0
  return (
    <span className="flex items-center gap-2">
      {/* Bars scale to 75 % of the row at most, so the value always fits at the tip. */}
      <span
        className="h-2 shrink-0 rounded-r-sm bg-note"
        style={{ width: `calc(${width}% * 0.75)` }}
      />
      <span className="text-sm">{label}</span>
    </span>
  )
}
