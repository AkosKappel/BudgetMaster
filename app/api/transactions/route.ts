import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import clientPromise from '@/lib/mongodb';
import { transactionSchema } from '@/schemas/transaction';

const DATABASE_NAME = 'BudgetMasterDB';
const COLLECTION_NAME = 'transactions';

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const transactions = await collection.find({}).toArray();

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsedBody = transactionSchema.parse({
      ...body,
      date: body?.date ? new Date(body.date) : new Date(),
    });
    console.log(parsedBody);

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const data = await collection.insertOne(parsedBody);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error }, { status: 500 });
  }
}
