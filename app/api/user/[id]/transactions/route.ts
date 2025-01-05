import { NextRequest, NextResponse } from 'next/server';

import { connectToDb } from '@/lib/mongodb';
import Transaction from '@/models/Transaction';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDb();
    const transactions = await Transaction.find({ ownerId: id }).sort({ date: -1 });
    return NextResponse.json(transactions, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const newTransaction = new Transaction({ ...body, ownerId: id });
    await newTransaction.save();
    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
