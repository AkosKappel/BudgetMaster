import { createFileRoute } from '@tanstack/react-router'
import { ReceiptText } from 'lucide-react'

import { EmptyState } from '@/components/empty-state'
import { Guilloche } from '@/components/guilloche'
import { formatMoney } from '@/lib/money'

export const Route = createFileRoute('/_app/')({ component: Home })

function Home() {
  const now = new Date()
  const month = now.toLocaleDateString('en', { month: 'long' })
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = lastDay - now.getDate() + 1

  return (
    <div className="flex flex-col gap-10">
      <section
        aria-labelledby="left-to-spend"
        className="relative isolate overflow-hidden rounded-xl border bg-card px-5 py-7"
      >
        <Guilloche className="mask-l-from-55% mask-l-to-90% absolute -top-16 -right-20 -z-10 size-72 text-note/45" />
        <h1 id="left-to-spend" className="text-muted-foreground text-sm">
          Left to spend in {month}
        </h1>
        <p className="mt-2 font-semibold text-5xl tracking-tight">
          {formatMoney(0, 'EUR', 'en')}
        </p>
        <p className="mt-3 text-muted-foreground text-sm">
          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left. Set a monthly
          budget to see what you can still spend.
        </p>
      </section>

      <section aria-labelledby="recent" className="flex flex-col gap-4">
        <h2 id="recent" className="font-semibold text-lg">
          Recent
        </h2>
        <EmptyState icon={ReceiptText}>
          No transactions yet. Add your first one to see where your money goes.
        </EmptyState>
      </section>
    </div>
  )
}
