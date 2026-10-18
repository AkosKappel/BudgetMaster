import { ArrowLeftRight, Repeat } from 'lucide-react'

import { iconFor } from '@/lib/icons'
import { formatMoney, formatSignedMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { LedgerTransaction } from '@/server/ledger'

interface Props {
  transaction: LedgerTransaction
  today: string
  // In shared spaces, show who entered it.
  showAuthor?: boolean
}

export function TransactionRow({ transaction: t, today, showAuthor }: Props) {
  const isTransfer = t.type === 'transfer'
  const Icon = isTransfer ? ArrowLeftRight : iconFor(t.category?.icon)
  const color = t.category?.color ?? 'var(--muted-foreground)'
  const title = t.payee ?? t.category?.name ?? 'Transfer'
  const details = isTransfer
    ? [`${t.wallet.name} to ${t.toWallet?.name}`]
    : [t.payee ? t.category?.name : null, t.wallet.name]
  if (showAuthor && t.author) details.push(`by ${t.author.name.split(' ')[0]}`)
  const planned = t.date > today
  const currency = t.wallet.currency

  return (
    <li className={cn('flex items-start gap-3 py-3', planned && 'opacity-70')}>
      <span
        className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full"
        style={{
          color,
          backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
        }}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{title}</span>
          {t.recurringRuleId && (
            <Repeat
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-label="Recurring"
            />
          )}
        </p>
        <p className="truncate text-muted-foreground text-sm">
          {planned && 'Planned, '}
          {details.filter(Boolean).join(', ')}
        </p>
        {t.tags.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Tags">
            {t.tags.map(({ tag }) => (
              <li
                key={tag.id}
                className="flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className={cn('font-medium', t.type === 'income' && 'text-income')}>
          {isTransfer
            ? formatMoney(t.amount, currency)
            : formatSignedMoney(
                t.type === 'income' ? t.amount : -t.amount,
                currency,
              )}
        </p>
        {isTransfer &&
          t.toAmount !== null &&
          t.toWallet &&
          t.toWallet.currency !== currency && (
            <p className="text-muted-foreground text-sm">
              {formatMoney(t.toAmount, t.toWallet.currency)}
            </p>
          )}
      </div>
    </li>
  )
}
