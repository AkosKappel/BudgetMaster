import { NextRequest, NextResponse } from 'next/server';

import { useDb } from '@/lib/mongodb';
import { transactionSchema } from '@/schemas/transaction';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const DATABASE_NAME = 'BudgetMasterDB';
const COLLECTION_NAME = 'transactions';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const { collection } = await useDb(DATABASE_NAME, COLLECTION_NAME);
    const transaction = await collection?.findOne({ _id: new ObjectId(id) });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ transaction }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const body = await req.json();
    const parsedBody = transactionSchema.parse(body);

    const { collection } = await useDb(DATABASE_NAME, COLLECTION_NAME);
    const data = await collection?.updateOne({ _id: new ObjectId(id) }, { $set: parsedBody });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const { collection } = await useDb(DATABASE_NAME, COLLECTION_NAME);
    const data = await collection?.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
