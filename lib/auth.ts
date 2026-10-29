import 'server-only';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { query, queryOne } from './db';
import type { User } from './types';

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
const SESSION_DAYS = 30;
export const SESSION_COOKIE = 'sid';

export async function hashPassword(password: string, salt: string) {
  return (await scrypt(password, salt, 64)).toString('hex');
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const given = Buffer.from(await hashPassword(password, salt), 'hex');
  const stored = Buffer.from(hash, 'hex');
  return given.length === stored.length && crypto.timingSafeEqual(given, stored);
}

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await query('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [token, userId, expires]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query('DELETE FROM sessions WHERE token = $1', [token]);
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return queryOne<User>(
    `SELECT u.id, u.username, u.display_name FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token],
  );
}
