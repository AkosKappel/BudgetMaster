import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

import { CashFlowChart } from '@/components/cash-flow-chart'
import { CategoryTrends } from '@/components/category-trends'
import { MoneyFlow } from '@/components/money-flow'
import { NetWorthChart } from '@/components/net-worth-chart'
import { SpendingCalendar } from '@/components/spending-calendar'
import {
  cashFlowQuery,
  categoryTrendsQuery,
  netWorthQuery,
  spendingCalendarQuery,
  useActiveSpace,
} from '@/lib/queries'

export const Route = createFileRoute('/_app/reports')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(cashFlowQuery(context.activeSpaceId)),
      context.queryClient.ensureQueryData(netWorthQuery(context.activeSpaceId)),
      context.queryClient.ensureQueryData(
        spendingCalendarQuery(context.activeSpaceId),
      ),
      context.queryClient.ensureQueryData(
        categoryTrendsQuery(context.activeSpaceId),
      ),
    ]),
  head: () => ({ meta: [{ title: 'Reports | BudgetMaster' }] }),
  component: Reports,
})

function Reports() {
  const space = useActiveSpace()
  const { data } = useSuspenseQuery(cashFlowQuery(space.id))
  const { data: netWorth } = useSuspenseQuery(netWorthQuery(space.id))
  const { data: calendar } = useSuspenseQuery(spendingCalendarQuery(space.id))
  const { data: trends } = useSuspenseQuery(categoryTrendsQuery(space.id))

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
      <section aria-labelledby="money-flow" className="flex flex-col gap-3">
        <h2 id="money-flow" className="font-semibold text-lg">
          Last month's money flow
        </h2>
        <MoneyFlow {...trends} />
      </section>
      <section aria-labelledby="trends" className="flex flex-col gap-3">
        <h2 id="trends" className="font-semibold text-lg">
          Spending by category
        </h2>
        <p className="text-muted-foreground text-sm">
          The last five complete months; the amount is last month's.
        </p>
        <CategoryTrends {...trends} />
      </section>
      <section aria-labelledby="net-worth" className="flex flex-col gap-3">
        <h2 id="net-worth" className="font-semibold text-lg">
          Net worth
        </h2>
        <NetWorthChart {...netWorth} />
      </section>
      <section aria-labelledby="calendar" className="flex flex-col gap-3">
        <h2 id="calendar" className="font-semibold text-lg">
          Spending calendar
        </h2>
        <SpendingCalendar {...calendar} />
      </section>
    </div>
  )
}
