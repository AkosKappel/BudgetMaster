export interface Rule {
  type: 'income' | 'expense'
  match: string
  categoryId: string
}

// The rule for a payee: the longest `match` contained in it (case-insensitive), so
// "lidl" covers every Lidl store and "lidl petrol" can still point elsewhere.
export function ruleFor(
  payee: string,
  type: string,
  rules: readonly Rule[],
): Rule | undefined {
  const text = payee.trim().toLowerCase()
  if (!text) return undefined
  return rules
    .filter((rule) => rule.type === type && text.includes(rule.match))
    .reduce<Rule | undefined>(
      (best, rule) =>
        !best || rule.match.length > best.match.length ? rule : best,
      undefined,
    )
}
