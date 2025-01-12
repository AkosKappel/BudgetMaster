import { NextRequest, NextResponse } from 'next/server';

import { connectToDb } from '@/lib/mongodb';
import { verifySession } from '@/lib/session';
import { rounded } from '@/lib/utils';
import Transaction from '@/models/Transaction';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifySession();
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');

    const now = new Date();
    const year = yearParam ? Number(yearParam) : now.getFullYear();
    const month = monthParam ? Number(monthParam) : now.getMonth() + 1;

    await connectToDb();
    const transactions = await Transaction.find({
      ownerId: userId,
      date: {
        $gte: new Date(year, month - 1).toISOString().split('T')[0],
        $lt: new Date(year, month).toISOString().split('T')[0],
      },
    }).exec();

    const aggregated = transactions.reduce(
      (acc, t) => {
        if (t.isExpense) {
          acc.expense = rounded(acc.expense + t.amount, 2);
        } else {
          acc.income = rounded(acc.income + t.amount, 2);
        }
        return acc;
      },
      { income: 0, expense: 0, balance: 0 },
    );
    aggregated.balance = rounded(aggregated.income - aggregated.expense, 2);

    return NextResponse.json({ transactions, aggregated }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
