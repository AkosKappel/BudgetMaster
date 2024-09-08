import { z } from 'zod';

export const transactionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().date().default(new Date().toISOString().split('T')[0]),
  isExpense: z.boolean().default(true),
  amount: z.number().positive(),
  description: z.string().optional(),
  labels: z.array(z.string()).default([]),
  sender: z.string().nullable(),
  receiver: z.string().nullable(),
});

export type TransactionData = z.infer<typeof transactionSchema>;
