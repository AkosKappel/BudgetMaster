import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { connectToDb } from '@/lib/mongodb';
import { transactionSchema } from '@/schemas/transactionSchema';

const DATABASE_NAME = 'BudgetMasterDB';
const COLLECTION_NAME = 'transactions';

export async function GET(req: NextRequest) {
  try {
    const { collection } = await connectToDb(DATABASE_NAME, COLLECTION_NAME);
    if (!collection) throw new Error(`Failed to connect to collection ${COLLECTION_NAME}`);

    const transactions = await collection.find({}).toArray();

    return NextResponse.json(transactions, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // _id is unknown before insetion
    const { _id, ...parsedBody } = transactionSchema.parse(body);

    const { collection } = await connectToDb(DATABASE_NAME, COLLECTION_NAME);
    if (!collection) throw new Error(`Failed to connect to collection ${COLLECTION_NAME}`);

    const { insertedId } = await collection.insertOne(parsedBody);
    const newTransaction = { ...parsedBody, _id: insertedId.toString() };

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error }, { status: 500 });
  }
}
