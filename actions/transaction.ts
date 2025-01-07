'use server';

import { connectToDb } from '@/lib/mongodb';
import { verifySession } from '@/lib/session';
import Transaction from '@/models/Transaction';
import { transactionSchema } from '@/schemas/transactionSchema';

type FormState =
  | {
      errors?: {
        title?: string[];
        date?: string[];
        isExpense?: string[];
        amount?: string[];
        description?: string[];
        category?: string[];
        labels?: string[];
        sender?: string[];
        receiver?: string[];
      };
      message?: string;
    }
  | undefined;

export async function createTransaction(state: FormState, formData: FormData): Promise<FormState> {
  const { userId } = await verifySession();
  if (!userId) return { message: 'Unauthorized' };

  const validated = transactionSchema.safeParse({
    title: formData.get('title'),
    date: formData.get('date'),
    isExpense: formData.get('isExpense') === 'true',
    amount: formData.get('amount'),
    description: formData.get('description'),
    category: formData.get('category'),
    labels: formData.get('labels') ?? [],
    sender: formData.get('sender'),
    receiver: formData.get('receiver'),
  });

  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  await connectToDb();

  const transaction = new Transaction({ ...validated.data, ownerId: userId });
  await transaction.save();

  if (!transaction) return { message: 'An error occurred while saving your transaction.' };
}
