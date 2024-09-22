import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { connectToDb } from '@/lib/mongodb';
import { transactionSchema } from '@/schemas/transactionSchema';

const DATABASE_NAME = 'BudgetMasterDB';
const COLLECTION_NAME = 'transactions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid input format' }, { status: 400 });
    }

    const parsedBody = body.map((transaction) => {
      // remove _id from transaction because it's unknown before creation
      const { _id, ...parsedTransaction } = transactionSchema.parse(transaction);
      return parsedTransaction;
    });

    const { collection } = await connectToDb(DATABASE_NAME, COLLECTION_NAME);
    if (!collection) throw new Error(`Failed to connect to collection ${COLLECTION_NAME}`);

    const result = await collection.insertMany(parsedBody);

    const newTransactions = parsedBody.map((transaction, index) => ({
      ...transaction,
      _id: result.insertedIds[index].toString(),
    }));

    return NextResponse.json(newTransactions, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error }, { status: 500 });
  }
}
