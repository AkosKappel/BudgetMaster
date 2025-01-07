import { NextRequest, NextResponse } from 'next/server';

import { connectToDb } from '@/lib/mongodb';
import { verifySession } from '@/lib/session';
import Transaction from '@/models/Transaction';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifySession();
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectToDb();
    const categories = await Transaction.distinct('category', { ownerId: userId }).sort({ category: 'asc' });

    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
