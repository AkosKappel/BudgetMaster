import { formatShortDate } from '@/lib/format-date'
import { formatMoney } from '@/lib/money'
import { m } from '@/paraglide/messages.js'
import type { SpendingCalendar as Calendar } from '@/server/reports'

// Five steps of the accent from no spending to the busiest days. Quartiles of the days
// with spending, so one big rent day does not flatten everything else.
const LEVELS = ['bg-muted', 'bg-note/25', 'bg-note/45', 'bg-note/70', 'bg-note']

function levelOf(total: number, cuts: number[]) {
  if (total === 0) return 0
  return 1 + cuts.filter((cut) => total > cut).length
}

const quantile = (sorted: number[], q: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0

// One column per week (the user's first day of the week on top), like a contribution calendar. The colours carry no
// information the text does not: the summary and the table list the busy days.
export function SpendingCalendar({ days, currency }: Calendar) {
  const money = (minor: number) => formatMoney(minor, currency)
  const spent = days
    .map((d) => d.total)
    .filter((t) => t > 0)
    .sort((a, b) => a - b)
  const cuts = [0.25, 0.5, 0.75].map((q) => quantile(spent, q))
  const top = [...days].sort((a, b) => b.total - a.total).slice(0, 5)
  const quiet = days.filter((d) => d.total === 0).length
  const weeks = Math.ceil(days.length / 7)

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="max-w-prose text-sm">
        {m.ov_calendar_quiet({ count: quiet, weeks })}
        {top[0]?.total
          ? ` ${m.ov_calendar_biggest({ date: formatShortDate(top[0].date), amount: money(top[0].total) })}`
          : ''}
      </figcaption>
      <div
        aria-hidden="true"
        className="grid grid-flow-col grid-rows-7 gap-0.5 overflow-x-auto pb-1"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0.5rem, 1fr))` }}
      >
        {days.map((d) => (
          <span
            key={d.date}
            title={`${formatShortDate(d.date)}: ${money(d.total)}`}
            className={`aspect-square rounded-[2px] ${LEVELS[levelOf(d.total, cuts)]}`}
          />
        ))}
      </div>
      <div
        className="flex items-center gap-1 text-muted-foreground text-xs"
        aria-hidden="true"
      >
        {m.ov_calendar_less()}
        {LEVELS.map((level) => (
          <span key={level} className={`size-2.5 rounded-[2px] ${level}`} />
        ))}
        {m.ov_calendar_more()}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          {m.ov_calendar_biggest_days()}
        </summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-normal">{m.ov_chart_day()}</th>
              <th className="py-1 text-right font-normal">
                {m.ov_calendar_spent()}
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {top
              .filter((d) => d.total > 0)
              .map((d) => (
                <tr key={d.date} className="border-t">
                  <td className="py-1">{formatShortDate(d.date)}</td>
                  <td className="py-1 text-right">{money(d.total)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
