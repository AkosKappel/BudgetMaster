import { ArrowLeftRight, Repeat, Split, Trash2 } from 'lucide-react'
import { animate, motion, type PanInfo, useMotionValue } from 'motion/react'
import { useRef } from 'react'

import { iconFor } from '@/lib/icons'
import { formatMoney, formatSignedMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { LedgerTransaction } from '@/server/ledger'

interface Props {
  transaction: LedgerTransaction
  today: string
  // In shared spaces, show who entered it.
  showAuthor?: boolean
  onSelect?: (transaction: LedgerTransaction) => void
  // Enables swipe left to delete on touch screens.
  onDelete?: (transaction: LedgerTransaction) => void
}

const ACTION_WIDTH = 96
const spring = { type: 'spring', stiffness: 500, damping: 40 } as const

export function TransactionRow({
  transaction: t,
  today,
  showAuthor,
  onSelect,
  onDelete,
}: Props) {
  const x = useMotionValue(0)
  const dragged = useRef(false)
  const isTransfer = t.type === 'transfer'
  const isSplit = t.splits.length > 0
  const Icon = isTransfer
    ? ArrowLeftRight
    : isSplit
      ? Split
      : iconFor(t.category?.icon)
  const color = t.category?.color ?? 'var(--muted-foreground)'
  // A split names its categories in order of size: "Groceries + Household".
  const categoryName = isSplit
    ? t.splits
        .toSorted((a, b) => b.amount - a.amount)
        .map((p) => p.category.name)
        .join(' + ')
    : t.category?.name
  const title = t.payee ?? categoryName ?? 'Transfer'
  const details = isTransfer
    ? [`${t.wallet.name} to ${t.toWallet?.name}`]
    : [t.payee ? categoryName : null, t.wallet.name]
  if (showAuthor && t.author) details.push(`by ${t.author.name.split(' ')[0]}`)
  const planned = t.date > today
  const currency = t.wallet.currency

  const settle = (_: unknown, info: PanInfo) => {
    const open = info.offset.x < -ACTION_WIDTH / 2 || info.velocity.x < -500
    animate(x, open ? -ACTION_WIDTH : 0, spring)
  }

  const content = (
    <>
      <span
        className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full"
        style={{
          color,
          backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
        }}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{title}</span>
          {t.recurringRuleId && (
            <Repeat
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-label="Recurring"
            />
          )}
        </span>
        <span className="truncate text-muted-foreground text-sm">
          {planned && 'Planned, '}
          {details.filter(Boolean).join(', ')}
        </span>
        {t.tags.length > 0 && (
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {t.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col text-right">
        <span
          className={cn('font-medium', t.type === 'income' && 'text-income')}
        >
          {isTransfer
            ? formatMoney(t.amount, currency)
            : formatSignedMoney(
                t.type === 'income' ? t.amount : -t.amount,
                currency,
              )}
        </span>
        {isTransfer &&
          t.toAmount !== null &&
          t.toWallet &&
          t.toWallet.currency !== currency && (
            <span className="text-muted-foreground text-sm">
              {formatMoney(t.toAmount, t.toWallet.currency)}
            </span>
          )}
      </span>
    </>
  )

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('relative overflow-hidden', planned && 'opacity-70')}
    >
      {onDelete && (
        // Touch shortcut only; keyboard and screen reader users delete in the edit sheet.
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onDelete(t)}
          className="absolute inset-y-0 right-0 flex items-center justify-center gap-1.5 bg-destructive font-medium text-destructive-foreground text-sm"
          style={{ width: ACTION_WIDTH }}
        >
          <Trash2 className="size-4" />
          Delete
        </button>
      )}
      <motion.div
        drag={onDelete ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={0.05}
        onDragStart={() => {
          dragged.current = true
        }}
        onDragEnd={settle}
        style={{ x }}
        className="relative bg-background"
      >
        {onSelect ? (
          <button
            type="button"
            onClick={() => {
              // A swipe ends with a click; ignore it, and close an open row on tap.
              if (dragged.current) {
                dragged.current = false
                return
              }
              if (x.get() !== 0) {
                animate(x, 0, spring)
                return
              }
              onSelect(t)
            }}
            className="flex w-full items-start gap-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {content}
          </button>
        ) : (
          <div className="flex items-start gap-3 py-3">{content}</div>
        )}
      </motion.div>
    </motion.li>
  )
}
