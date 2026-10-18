import { createFileRoute } from '@tanstack/react-router'
import { ReceiptText } from 'lucide-react'

import { EmptyState } from '@/components/empty-state'

export const Route = createFileRoute('/_app/activity')({
  head: () => ({ meta: [{ title: 'Activity | BudgetMaster' }] }),
  component: Activity,
})

function Activity() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-semibold text-2xl tracking-tight">Activity</h1>
      <EmptyState icon={ReceiptText}>
        Every income, expense and transfer shows up here, grouped by day.
        Nothing recorded yet.
      </EmptyState>
    </div>
  )
}
