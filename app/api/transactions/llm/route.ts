import { NextRequest, NextResponse } from 'next/server';

import { TransactionData } from '@/schemas/transactionSchema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content } = body;
    console.log('content', content);

    // simulate LLM processing and return new dummy transactions
    const newTransactions: TransactionData[] = [
      {
        date: '2024-05-01',
        amount: Number((Math.random() * 100).toFixed(2)),
        category: 'test',
        description: 'Dummy transaction from LLM',
        labels: ['Dummy', 'Test'],
        title: 'Dummy transaction ' + Math.random().toString(36),
        isExpense: Math.random() < 0.5,
      },
    ];
    const secondsToWait = Math.floor(Math.random() * 10) + 3;
    await new Promise((resolve) => setTimeout(resolve, secondsToWait * 1000));

    return NextResponse.json(newTransactions, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
