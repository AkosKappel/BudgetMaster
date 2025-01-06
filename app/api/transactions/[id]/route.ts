import { NextRequest, NextResponse } from 'next/server';

import { connectToDb } from '@/lib/mongodb';
import { verifySession } from '@/lib/session';
import Transaction from '@/models/Transaction';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await verifySession();
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await connectToDb();
    const foundTransaction = await Transaction.findOne({
      _id: id,
      ownerId: userId,
    });

    if (!foundTransaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    return NextResponse.json(foundTransaction, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await verifySession();
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    await connectToDb();
    const updatedTransaction = await Transaction.findOneAndUpdate(
      {
        _id: id,
        ownerId: userId,
      },
      body,
      { new: true },
    );

    if (!updatedTransaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    return NextResponse.json(updatedTransaction, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await verifySession();
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await connectToDb();
    const deletedTransaction = await Transaction.findOneAndDelete({
      _id: id,
      ownerId: userId,
    });

    if (!deletedTransaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    return NextResponse.json(deletedTransaction, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
