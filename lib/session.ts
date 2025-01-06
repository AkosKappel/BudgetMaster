import { cookies } from 'next/headers';

import { JWTPayload, SignJWT, jwtVerify } from 'jose';
import 'server-only';

const secretKey = process.env.SECRET_KEY;
const key = new TextEncoder().encode(secretKey);

const sessionCookieName = 'session';
const sessionDuration = 24 * 60 * 60 * 1000; // 1 day

export type SessionPayload = JWTPayload & {
  userId: string;
  expiresAt: Date;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1hr').sign(key);
}

export async function decrypt(session: string | undefined = ''): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, key, { algorithms: ['HS256'] });
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(sessionCookieName)?.value;
  if (!session) return null;

  const payload = await decrypt(session);
  return payload;
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + sessionDuration);
  const session = await encrypt({ userId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function verifySession(): Promise<{ isAuth: boolean; userId: string | null }> {
  const cookieStore = await cookies();
  const session = cookieStore.get(sessionCookieName)?.value;
  const payload = await decrypt(session);

  if (!payload?.userId) return { isAuth: false, userId: null };
  return { isAuth: true, userId: payload.userId };
}

export async function updateSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(sessionCookieName)?.value;
  const payload = await decrypt(session);

  if (!session || !payload) return false;

  const expiresAt = new Date(Date.now() + sessionDuration);
  cookieStore.set(sessionCookieName, session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  return true;
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}
