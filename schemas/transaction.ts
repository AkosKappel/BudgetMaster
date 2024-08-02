import { z } from 'zod';

export const transactionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.date(),
  amount: z.number(),
  description: z.string().optional(),
  labels: z.array(z.string()).default([]),
  sender: z.string().optional(),
  receiver: z.string().optional(),
});

export type Transaction = z.infer<typeof transactionSchema>;
