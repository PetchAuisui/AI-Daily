import { NextResponse } from 'next/server';
import { STATE_COOKIE, VERIFIER_COOKIE, appOrigin, isProvider, startAuth } from '@/lib/oauth';

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
