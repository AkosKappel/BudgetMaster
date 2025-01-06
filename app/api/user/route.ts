import { NextRequest, NextResponse } from 'next/server';

import { connectToDb } from '@/lib/mongodb';
import { verifySession } from '@/lib/session';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await verifySession();
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectToDb();
    const user = await User.findOne({ _id: userId });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
