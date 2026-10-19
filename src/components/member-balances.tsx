import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { formatShortDate } from '@/lib/format-date'
import { formatMoney } from '@/lib/money'
import { balancesQuery } from '@/lib/queries'
import { recordSettlement } from '@/server/balances'

// Who owes whom in a shared space (I-09): expenses a member paid from their own money,
// shared equally, minus what was paid back.
export function MemberBalances({ spaceId }: { spaceId: string }) {
  const queryClient = useQueryClient()
  const { data } = useQuery(balancesQuery(spaceId))
  const settle = useMutation({
    mutationFn: recordSettlement,
    onSuccess: () => {
      toast.success('Payment recorded')
      return queryClient.invalidateQueries(balancesQuery(spaceId))
    },
    onError: (e) => toast.error(e.message),
  })
  if (!data) return null
  const money = (minor: number) => formatMoney(minor, data.currency)
  const you = (id: string, name: string) =>
    id === data.currentUserId ? 'You' : name

  return (
    <section aria-labelledby="balances" className="flex flex-col gap-3">
      <h2 id="balances" className="font-semibold text-lg">
        Balances
      </h2>
      <p className="max-w-prose text-muted-foreground text-sm">
        Expenses someone paid from their own money ("Paid by" in quick add) are
        shared equally. Expenses from shared money do not count here.
      </p>
      <ul className="divide-y rounded-lg border bg-card text-sm">
        {data.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1 truncate font-medium">
              {you(m.id, m.name)}
            </span>
            <span
              className={
                m.balance > 0 ? 'text-income' : 'text-muted-foreground'
              }
            >
              {m.balance > 0
                ? `gets back ${money(m.balance)}`
                : m.balance < 0
                  ? `owes ${money(-m.balance)}`
                  : 'settled up'}
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
                {you(t.from, t.fromName)}{' '}
                {t.from === data.currentUserId ? 'pay' : 'pays'}{' '}
                {t.to === data.currentUserId ? 'you' : t.toName}{' '}
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
                  Mark as paid
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {data.recentSettlements.length > 0 && (
        <div className="flex flex-col gap-1 text-muted-foreground text-sm">
          <h3 className="font-medium text-foreground">Paid back</h3>
          <ul>
            {data.recentSettlements.map((s) => (
              <li key={s.id}>
                {formatShortDate(s.date)}: {you(s.fromUserId, s.fromName)} paid{' '}
                {s.toUserId === data.currentUserId ? 'you' : s.toName}{' '}
                {money(s.amount)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
