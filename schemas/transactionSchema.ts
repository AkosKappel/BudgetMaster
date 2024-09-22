import { z } from 'zod';

import { nullify, toTitleCase } from '@/lib/utils';

export const transactionSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  date: z.string().date().default(new Date().toISOString().split('T')[0]),
  isExpense: z.boolean(),
  amount: z
    .number()
    .positive('Amount must be positive')
    .refine((val) => !isNaN(val), { message: 'Amount must be a valid number' }),
  description: z.string().trim().optional(),
  labels: z.array(z.string().trim().transform(toTitleCase)).default([]),
  sender: z.string().trim().transform(nullify).nullish(),
  receiver: z.string().trim().transform(nullify).nullish(),
});

export type TransactionData = z.infer<typeof transactionSchema>;
