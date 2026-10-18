import { createFileRoute } from '@tanstack/react-router'
import { Gauge } from 'lucide-react'

import { EmptyState } from '@/components/empty-state'

export const Route = createFileRoute('/_app/budgets')({
  head: () => ({ meta: [{ title: 'Budgets | BudgetMaster' }] }),
  component: Budgets,
})

function Budgets() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-semibold text-2xl tracking-tight">Budgets</h1>
      <EmptyState icon={Gauge}>
        Set a monthly limit for a category to see how much is left before you go
        over.
      </EmptyState>
    </div>
  )
}
