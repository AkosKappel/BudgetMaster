import { z } from 'zod';

export const cashflowSchema = z.object({
  income: z.number(),
  expense: z.number(),
  balance: z.number(),
});

export type Cashflow = z.infer<typeof cashflowSchema>;
