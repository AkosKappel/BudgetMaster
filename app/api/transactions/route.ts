import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { useDb } from '@/lib/mongodb';
import { transactionSchema } from '@/schemas/transaction';

const DATABASE_NAME = 'BudgetMasterDB';
const COLLECTION_NAME = 'transactions';

export async function GET(req: NextRequest) {
  try {
    const { collection } = await useDb(DATABASE_NAME, COLLECTION_NAME);
    const transactions = await collection?.find({}).toArray();

    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsedBody = transactionSchema.parse(body);

    const { collection } = await useDb(DATABASE_NAME, COLLECTION_NAME);
    const data = await collection?.insertOne(parsedBody);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error }, { status: 500 });
  }
}
