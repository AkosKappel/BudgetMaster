import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { formatShortDate } from '@/lib/format-date'
import { formatMoney } from '@/lib/money'
import { balancesQuery } from '@/lib/queries'
import { m } from '@/paraglide/messages.js'
import { recordSettlement } from '@/server/balances'

// Who owes whom in a shared space (I-09): expenses a member paid from their own money,
// shared equally, minus what was paid back.
export function MemberBalances({ spaceId }: { spaceId: string }) {
  const queryClient = useQueryClient()
  const { data } = useQuery(balancesQuery(spaceId))
  const settle = useMutation({
    mutationFn: recordSettlement,
    onSuccess: () => {
      toast.success(m.acct_balances_recorded())
      return queryClient.invalidateQueries(balancesQuery(spaceId))
    },
    onError: (e) => toast.error(e.message),
  })
  if (!data) return null
  const money = (minor: number) => formatMoney(minor, data.currency)
  const me = data.currentUserId
  const you = (id: string, name: string) =>
    id === me ? m.acct_changes_you() : name

  return (
    <section aria-labelledby="balances" className="flex flex-col gap-3">
      <h2 id="balances" className="font-semibold text-lg">
        {m.acct_balances_title()}
      </h2>
      <p className="max-w-prose text-muted-foreground text-sm">
        {m.acct_balances_intro()}
      </p>
      <ul className="divide-y rounded-lg border bg-card text-sm">
        {data.members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1 truncate font-medium">
              {you(member.id, member.name)}
            </span>
            <span
              className={
                member.balance > 0 ? 'text-income' : 'text-muted-foreground'
              }
            >
              {member.balance > 0
                ? m.acct_balances_gets_back({ amount: money(member.balance) })
                : member.balance < 0
                  ? m.acct_balances_owes({ amount: money(-member.balance) })
                  : m.acct_balances_settled()}
            </span>
          </li>
        ))}
      </ul>
      {data.transfers.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.transfers.map((t) => (
            <li
              key={`${t.from}-${t.to}`}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-4 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1">
                {t.from === me
                  ? m.acct_balances_you_pay({ to: t.toName })
                  : t.to === me
                    ? m.acct_balances_pays_you({ from: t.fromName })
                    : m.acct_balances_pays({
                        from: t.fromName,
                        to: t.toName,
                      })}{' '}
                <span className="font-medium">{money(t.amount)}</span>
              </span>
              {data.canWrite && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={settle.isPending}
                  onClick={() =>
                    settle.mutate({
                      data: {
                        spaceId,
                        fromUserId: t.from,
                        toUserId: t.to,
                        amount: t.amount,
                      },
                    })
                  }
                >
                  {m.acct_balances_mark_paid()}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {data.recentSettlements.length > 0 && (
        <div className="flex flex-col gap-1 text-muted-foreground text-sm">
          <h3 className="font-medium text-foreground">
            {m.acct_balances_paid_back()}
          </h3>
          <ul>
            {data.recentSettlements.map((s) => (
              <li key={s.id}>
                {formatShortDate(s.date)}:{' '}
                {s.fromUserId === me
                  ? m.acct_balances_you_paid({
                      to: s.toName,
                      amount: money(s.amount),
                    })
                  : s.toUserId === me
                    ? m.acct_balances_paid_you({
                        from: s.fromName,
                        amount: money(s.amount),
                      })
                    : m.acct_balances_paid({
                        from: s.fromName,
                        to: s.toName,
                        amount: money(s.amount),
                      })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
