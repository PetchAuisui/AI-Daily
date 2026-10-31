import { createSession, verifyPassword } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { fail, json, readBody } from '@/lib/http';

export async function POST(req: Request) {
  const b = await readBody(req);
  const u = await queryOne<{ id: number; password_hash: string | null; salt: string | null }>(
    'SELECT id, password_hash, salt FROM users WHERE lower(username) = lower($1)',
    [String(b.username ?? '').trim()],
  );
  // บัญชีที่สมัครผ่าน OAuth ไม่มีรหัสผ่าน
  if (!u?.password_hash || !u.salt || !(await verifyPassword(String(b.password ?? ''), u.salt, u.password_hash))) {
    return fail('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
  }
  await createSession(u.id);
  return json({ ok: true });
}
