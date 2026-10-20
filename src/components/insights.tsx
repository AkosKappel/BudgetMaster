import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CopyCheck, type LucideIcon, TrendingUp } from 'lucide-react'

import { formatShortDate } from '@/lib/format-date'
import type { Insight } from '@/lib/insights'
import { formatMoney } from '@/lib/money'
import { insightsQuery } from '@/lib/queries'
import { m } from '@/paraglide/messages.js'

// "Worth a look" on Home: plain sentences, each with a way to check it. Hidden when there
// is nothing to say.
export function Insights({ spaceId }: { spaceId: string }) {
  const { data } = useQuery(insightsQuery(spaceId))
  if (!data?.insights.length) return null
  const money = (minor: number) => formatMoney(minor, data.currency)

  return (
    <section aria-labelledby="insights" className="flex flex-col gap-3">
      <h2 id="insights" className="font-semibold text-lg">
        {m.ov_insights_title()}
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
          {m.ov_insights_duplicate({
            payee: insight.payee,
            amount: money(insight.amount),
            first: formatShortDate(insight.dates[0]),
            second: formatShortDate(insight.dates[1]),
          })}{' '}
          <Link
            to="/activity"
            search={{ q: insight.payee }}
            className={linkClass}
          >
            {m.ov_insights_check()}
          </Link>
        </p>
      )
    case 'price-rise':
      return (
        <p>
          {m.ov_insights_price_rise({
            payee: insight.payee,
            before: money(insight.before),
            after: money(insight.after),
            percent: Math.round(
              ((insight.after - insight.before) / insight.before) * 100,
            ),
          })}{' '}
          <Link to="/recurring" className={linkClass}>
            {m.ov_recurring_link()}
          </Link>
        </p>
      )
    case 'category-up':
      return (
        <p>
          {(insight.weekendShare === 100
            ? m.ov_insights_category_up_weekend_all
            : insight.weekendShare >= 60
              ? m.ov_insights_category_up_weekend
              : m.ov_insights_category_up)({
            category: insight.category,
            change: insight.change,
            now: money(insight.now),
            before: money(insight.before),
            share: insight.weekendShare,
          })}
        </p>
      )
  }
}
