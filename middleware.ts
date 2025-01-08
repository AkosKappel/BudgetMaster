import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { decrypt } from '@/lib/session';

const protectedRoutes = ['/dashboard', '/history', '/stats', '/savings', '/import', '/export', '/settings'];
const publicRoutes = ['/login', '/signup'];

export default async function middleware(req: NextRequest) {
  const currentPath = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(currentPath);
  const isPublicRoute = publicRoutes.includes(currentPath);

  const cookieStore = await cookies();
  const cookie = cookieStore.get('session')?.value;
  const session = await decrypt(cookie);

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/BudgetMaster/login', req.nextUrl));
  }

  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL('/BudgetMaster/dashboard', req.nextUrl));
  }

  return NextResponse.next();
}
