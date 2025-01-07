import { NextRequest, NextResponse } from 'next/server';

import { connectToDb } from '@/lib/mongodb';
import { verifySession } from '@/lib/session';
import Transaction from '@/models/Transaction';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifySession();
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectToDb();
    const labels = await Transaction.distinct('labels', { ownerId: userId }).sort({ labels: 'asc' });

    return NextResponse.json(labels, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
