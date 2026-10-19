// Who owes whom in a shared space (I-09). An expense paid by one member out of their own
// pocket is shared equally by all current members; a settlement moves money back.

export interface PaidExpense {
  paidBy: string
  amount: number
}

export interface Settlement {
  fromUserId: string
  toUserId: string
  amount: number
}

export interface Transfer {
  from: string
  to: string
  amount: number
}

// Net balance per member in minor units: positive means the others owe them. Shares are
// whole minor units; the leftover cents go to the first members, so balances add up to 0.
// Entries of members who left are skipped; a share list per expense would be needed to
// keep their open balances.
export function memberBalances(
  memberIds: string[],
  expenses: PaidExpense[],
  settlements: Settlement[],
) {
  const balances = new Map(memberIds.map((id) => [id, 0]))
  const add = (id: string, amount: number) =>
    balances.set(id, (balances.get(id) ?? 0) + amount)

  for (const { paidBy, amount } of expenses) {
    if (!balances.has(paidBy)) continue
    add(paidBy, amount)
    const share = Math.floor(amount / memberIds.length)
    const leftover = amount - share * memberIds.length
    memberIds.forEach((id, i) => {
      add(id, -(share + (i < leftover ? 1 : 0)))
    })
  }
  for (const { fromUserId, toUserId, amount } of settlements) {
    if (!balances.has(fromUserId) || !balances.has(toUserId)) continue
    add(fromUserId, amount)
    add(toUserId, -amount)
  }
  return balances
}

// Payments that clear every balance: the biggest debtor pays the biggest creditor until
// one of them is even. At most one payment fewer than there are members.
export function settleUp(balances: Map<string, number>): Transfer[] {
  const owed = [...balances]
    .filter(([, b]) => b > 0)
    .map(([id, b]) => ({ id, left: b }))
  const owing = [...balances]
    .filter(([, b]) => b < 0)
    .map(([id, b]) => ({ id, left: -b }))
  const transfers: Transfer[] = []
  for (;;) {
    owed.sort((a, b) => b.left - a.left)
    owing.sort((a, b) => b.left - a.left)
    const creditor = owed[0]
    const debtor = owing[0]
    if (!creditor?.left || !debtor?.left) return transfers
    const amount = Math.min(creditor.left, debtor.left)
    transfers.push({ from: debtor.id, to: creditor.id, amount })
    creditor.left -= amount
    debtor.left -= amount
  }
}
