import { z } from 'zod';

export const transactionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.date().default(new Date()),
  isExpense: z.boolean().default(true),
  amount: z.number().positive(),
  description: z.string().optional(),
  labels: z.array(z.string()).default([]),
  sender: z.string().optional(),
  receiver: z.string().optional(),
});

export type TransactionData = z.infer<typeof transactionSchema>;
