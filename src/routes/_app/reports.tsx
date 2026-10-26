import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, FileText, Sparkles } from 'lucide-react'

import { CashFlowChart } from '@/components/cash-flow-chart'
import { CategoryTrends } from '@/components/category-trends'
import { ForecastChart } from '@/components/forecast-chart'
import { MoneyFlow } from '@/components/money-flow'
import { NetWorthChart } from '@/components/net-worth-chart'
import { PriceChanges } from '@/components/price-changes'
import { SpendingCalendar } from '@/components/spending-calendar'
import { Button } from '@/components/ui/button'
import {
  cashFlowQuery,
  categoryTrendsQuery,
  forecastQuery,
  netWorthQuery,
  priceChangesQuery,
  spendingCalendarQuery,
  useActiveSpace,
} from '@/lib/queries'
import { m } from '@/paraglide/messages.js'

export const Route = createFileRoute('/_app/reports')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(cashFlowQuery(context.activeSpaceId)),
      context.queryClient.ensureQueryData(netWorthQuery(context.activeSpaceId)),
      context.queryClient.ensureQueryData(forecastQuery(context.activeSpaceId)),
      context.queryClient.ensureQueryData(
        priceChangesQuery(context.activeSpaceId),
      ),
      context.queryClient.ensureQueryData(
        spendingCalendarQuery(context.activeSpaceId),
      ),
      context.queryClient.ensureQueryData(
        categoryTrendsQuery(context.activeSpaceId),
      ),
    ]),
  head: () => ({ meta: [{ title: m.ov_reports_meta_title() }] }),
  component: Reports,
})

function Reports() {
  const space = useActiveSpace()
  const { data } = useSuspenseQuery(cashFlowQuery(space.id))
  const { data: netWorth } = useSuspenseQuery(netWorthQuery(space.id))
  const { data: calendar } = useSuspenseQuery(spendingCalendarQuery(space.id))
  const { data: trends } = useSuspenseQuery(categoryTrendsQuery(space.id))
  const { data: forecast } = useSuspenseQuery(forecastQuery(space.id))
  const { data: prices } = useSuspenseQuery(priceChangesQuery(space.id))

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/more"
        className="-ml-2 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {m.ov_reports_more()}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.ov_reports_title()}
        </h1>
        <Button variant="outline" asChild>
          <Link to="/monthly-report">
            <FileText />
            {m.ov_monthly_title()}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/year-in-review">
            <Sparkles />
            {m.ov_year_title()}
          </Link>
        </Button>
      </div>
      <section aria-labelledby="cash-flow" className="flex flex-col gap-3">
        <h2 id="cash-flow" className="text-lg font-semibold">
          {m.ov_reports_cash_flow()}
        </h2>
        <CashFlowChart {...data} />
      </section>
      <section aria-labelledby="money-flow" className="flex flex-col gap-3">
        <h2 id="money-flow" className="text-lg font-semibold">
          {m.ov_reports_money_flow()}
        </h2>
        <MoneyFlow {...trends} />
      </section>
      <section aria-labelledby="trends" className="flex flex-col gap-3">
        <h2 id="trends" className="text-lg font-semibold">
          {m.ov_reports_trends()}
        </h2>
        <p className="text-sm text-muted-foreground">
          {m.ov_reports_trends_hint()}
        </p>
        <CategoryTrends {...trends} />
      </section>
      <section aria-labelledby="net-worth" className="flex flex-col gap-3">
        <h2 id="net-worth" className="text-lg font-semibold">
          {m.ov_networth_title()}
        </h2>
        <NetWorthChart {...netWorth} />
      </section>
      <section aria-labelledby="forecast" className="flex flex-col gap-3">
        <h2 id="forecast" className="text-lg font-semibold">
          {m.ov_reports_forecast()}
        </h2>
        <p className="text-sm text-muted-foreground">
          {m.ov_reports_forecast_hint()}
        </p>
        <ForecastChart {...forecast} />
      </section>
      <section aria-labelledby="prices" className="flex flex-col gap-3">
        <h2 id="prices" className="text-lg font-semibold">
          {m.ov_reports_prices()}
        </h2>
        <p className="text-sm text-muted-foreground">
          {m.ov_reports_prices_hint()}
        </p>
        <PriceChanges {...prices} />
      </section>
      <section aria-labelledby="calendar" className="flex flex-col gap-3">
        <h2 id="calendar" className="text-lg font-semibold">
          {m.ov_reports_calendar()}
        </h2>
        <SpendingCalendar {...calendar} />
      </section>
    </div>
  )
}
