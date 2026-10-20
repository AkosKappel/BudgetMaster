import { ArrowDown, ArrowUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages.js'

// Up and down buttons for a row in a hand-ordered list (wallets, categories).
export function MoveButtons({
  name,
  index,
  count,
  disabled,
  onMove,
}: {
  name: string
  index: number
  count: number
  disabled: boolean
  onMove: (by: -1 | 1) => void
}) {
  return (
    <div className="flex flex-col">
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={m.shell_move_up({ name })}
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={m.shell_move_down({ name })}
        disabled={disabled || index === count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown />
      </Button>
    </div>
  )
}

// The ids in their new order after moving one place up or down.
export function swapped(ids: string[], index: number, by: -1 | 1) {
  const next = [...ids]
  ;[next[index], next[index + by]] = [next[index + by], next[index]]
  return next
}
