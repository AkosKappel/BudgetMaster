import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CopyCheck, type LucideIcon, TrendingUp } from 'lucide-react'

import { formatShortDate } from '@/lib/format-date'
import type { Insight } from '@/lib/insights'
import { formatMoney } from '@/lib/money'
import { insightsQuery } from '@/lib/queries'

// "Worth a look" on Home: plain sentences, each with a way to check it. Hidden when there
// is nothing to say.
export function Insights({ spaceId }: { spaceId: string }) {
  const { data } = useQuery(insightsQuery(spaceId))
  if (!data?.insights.length) return null
  const money = (minor: number) => formatMoney(minor, data.currency)

  return (
    <section aria-labelledby="insights" className="flex flex-col gap-3">
      <h2 id="insights" className="font-semibold text-lg">
        Worth a look
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {data.insights.map((insight) => (
          <li
            key={`${insight.kind}-${'payee' in insight ? insight.payee : insight.category}`}
            className="flex items-start gap-3 px-4 py-3 text-sm"
          >
            <InsightIcon insight={insight} />
            <InsightText insight={insight} money={money} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function InsightIcon({ insight }: { insight: Insight }) {
  const Icon: LucideIcon = insight.kind === 'duplicate' ? CopyCheck : TrendingUp
  return (
    <Icon
      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      aria-hidden="true"
    />
  )
}

function InsightText({
  insight,
  money,
}: {
  insight: Insight
  money: (minor: number) => string
}) {
  const linkClass = 'underline underline-offset-4'
  switch (insight.kind) {
    case 'duplicate':
      return (
        <p>
          {insight.payee} twice for {money(insight.amount)}, on{' '}
          {formatShortDate(insight.dates[0])} and{' '}
          {formatShortDate(insight.dates[1])}. Charged twice?{' '}
          <Link
            to="/activity"
            search={{ q: insight.payee }}
            className={linkClass}
          >
            Check
          </Link>
        </p>
      )
    case 'price-rise':
      return (
        <p>
          {insight.payee} went up from {money(insight.before)} to{' '}
          {money(insight.after)} (+
          {Math.round(
            ((insight.after - insight.before) / insight.before) * 100,
          )}{' '}
          %).{' '}
          <Link to="/recurring" className={linkClass}>
            Recurring
          </Link>
        </p>
      )
    case 'category-up':
      return (
        <p>
          {insight.category} is up {insight.change} % on the same days last
          month: {money(insight.now)} against {money(insight.before)}
          {insight.weekendShare >= 60
            ? `, ${insight.weekendShare} % of it on weekends.`
            : '.'}
        </p>
      )
  }
}
