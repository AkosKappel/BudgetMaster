import { z } from 'zod'

// Activity filters, shared by the route's URL search params and the server function.
// Invalid values (an old link, a hand-edited URL) are dropped instead of failing the page.
const optional = <T extends z.ZodType>(schema: T) =>
  schema.optional().catch(undefined)

export const transactionFiltersSchema = z.object({
  q: optional(
    z
      .string()
      .trim()
      .max(60)
      .transform((value) => value || undefined),
  ),
  type: optional(z.enum(['income', 'expense', 'transfer'])),
  category: optional(z.uuid()),
  wallet: optional(z.uuid()),
  tag: optional(z.uuid()),
  from: optional(z.iso.date()),
  to: optional(z.iso.date()),
  // Whole amounts in each wallet's own currency, as people type them: min=50, not 5000 cents.
  min: optional(z.number().nonnegative()),
  max: optional(z.number().nonnegative()),
})

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>

export const activeFilterCount = (filters: TransactionFilters) =>
  Object.values(filters).filter((value) => value !== undefined).length
