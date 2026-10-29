import crypto from 'node:crypto';
import { createSession, hashPassword } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { fail, json, readBody } from '@/lib/http';

export async function POST(req: Request) {
  const b = await readBody(req);
  const username = String(b.username ?? '').trim();
  const password = String(b.password ?? '');
  const display = String(b.display_name ?? '').trim().slice(0, 40) || username.split('@')[0];
  // รับได้ทั้ง username ธรรมดาและอีเมล
  if (!/^[a-zA-Z0-9_.+@-]{3,100}$/.test(username)) return fail('ชื่อผู้ใช้/อีเมล 3–100 ตัว (a-z, 0-9, _ . - + @)');
  if (password.length < 6) return fail('รหัสผ่านอย่างน้อย 6 ตัวอักษร');
  if (await queryOne('SELECT 1 FROM users WHERE lower(username) = lower($1)', [username])) {
    return fail('ชื่อผู้ใช้นี้ถูกใช้แล้ว', 409);
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const user = await queryOne<{ id: number }>(
    'INSERT INTO users (username, display_name, password_hash, salt) VALUES ($1, $2, $3, $4) RETURNING id',
    [username, display, await hashPassword(password, salt), salt],
  );
  await createSession(user!.id);
  return json({ ok: true }, 201);
}
