import { z } from 'zod';

import { toTitleCase } from '@/lib/utils';

export const transactionSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(1, 'Title is required').trim(),
  date: z.string().date().default(new Date().toISOString().split('T')[0]),
  isExpense: z.boolean(),
  amount: z.coerce
    .number()
    .positive('Amount must be positive')
    .refine((val) => !isNaN(val), { message: 'Amount must be a valid number' }),
  description: z.string().trim().default(''),
  category: z.string().min(1, 'Category is required').trim().transform(toTitleCase),
  labels: z.array(z.string().trim().transform(toTitleCase)).default([]),
  sender: z.string().trim().default(''),
  receiver: z.string().trim().default(''),
});

export type Transaction = z.infer<typeof transactionSchema>;
