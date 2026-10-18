import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

import { CashFlowChart } from '@/components/cash-flow-chart'
import { cashFlowQuery, useActiveSpace } from '@/lib/queries'

export const Route = createFileRoute('/_app/reports')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(cashFlowQuery(context.activeSpaceId)),
  head: () => ({ meta: [{ title: 'Reports | BudgetMaster' }] }),
  component: Reports,
})

function Reports() {
  const space = useActiveSpace()
  const { data } = useSuspenseQuery(cashFlowQuery(space.id))

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/more"
        className="-ml-2 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        More
      </Link>
      <h1 className="font-semibold text-2xl tracking-tight">Reports</h1>
      <section aria-labelledby="cash-flow" className="flex flex-col gap-3">
        <h2 id="cash-flow" className="font-semibold text-lg">
          Income and spending
        </h2>
        <CashFlowChart {...data} />
      </section>
    </div>
  )
}
