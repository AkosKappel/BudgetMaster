import { createFileRoute } from '@tanstack/react-router'
import { Ellipsis } from 'lucide-react'

import { EmptyState } from '@/components/empty-state'

export const Route = createFileRoute('/_app/more')({
  head: () => ({ meta: [{ title: 'More | BudgetMaster' }] }),
  component: More,
})

function More() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-semibold text-2xl tracking-tight">More</h1>
      <EmptyState icon={Ellipsis}>
        Wallets, categories, tags, recurring payments and settings will live
        here.
      </EmptyState>
    </div>
  )
}
