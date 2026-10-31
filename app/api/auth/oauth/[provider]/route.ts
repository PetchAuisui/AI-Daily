import { NextResponse } from 'next/server';
import { fail, json, requireUser } from '@/lib/http';
import { STATE_COOKIE, VERIFIER_COOKIE, appOrigin, isProvider, startAuth, unlinkAccount } from '@/lib/oauth';

type Ctx = { params: Promise<{ provider: string }> };

const COOKIE = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 } as const;

// เริ่ม OAuth: redirect ไปหน้ายินยอมของ provider (ถ้า login อยู่แล้ว callback จะผูกบัญชีเข้ากับ user เดิม)
export async function GET(req: Request, { params }: Ctx) {
  const { provider } = await params;
  const origin = appOrigin(req);
  const auth = isProvider(provider) ? startAuth(provider, origin) : null;
  if (!auth) return NextResponse.redirect(`${origin}/login?error=provider`);
  const res = NextResponse.redirect(auth.url);
  res.cookies.set(STATE_COOKIE, auth.state, COOKIE);
  if (auth.verifier) res.cookies.set(VERIFIER_COOKIE, auth.verifier, COOKIE);
  return res;
}

// ยกเลิกการเชื่อมบัญชี provider นี้ออกจาก user ที่ login อยู่
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { provider } = await params;
  if (!isProvider(provider)) return fail('ไม่รู้จักช่องทางนี้', 404);
  const r = await unlinkAccount(user.id, provider);
  if (r === 'missing') return fail('ยังไม่ได้เชื่อมบัญชีนี้', 404);
  if (r === 'last') return fail('ยกเลิกไม่ได้: เป็นช่องทางเข้าสู่ระบบเดียวที่เหลือ ตั้งรหัสผ่านหรือเชื่อมช่องทางอื่นก่อน');
  return json({ ok: true });
}
