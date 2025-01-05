import { cookies } from 'next/headers';

import { SignJWT, jwtVerify } from 'jose';
import 'server-only';

const secretKey = process.env.SECRET_KEY;
const key = new TextEncoder().encode(secretKey);

const cookieName = 'session';
const sessionDuration = 60 * 60 * 1000; // 1 hour

export type SessionPayload = {
  userId: string | number;
  expiresAt: Date;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1hr').sign(key);
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + sessionDuration);
  const session = await encrypt({ userId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(cookieName, session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(cookieName)?.value;
  const payload = await decrypt(session);

  if (!payload?.userId) return { isAuth: false };
  return { isAuth: true, ...payload };
}

export async function updateSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(cookieName)?.value;
  const payload = await decrypt(session);

  if (!session || !payload) return null;

  const expires = new Date(Date.now() + sessionDuration);
  cookieStore.set(cookieName, session, {
    httpOnly: true,
    secure: true,
    expires: expires,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}
