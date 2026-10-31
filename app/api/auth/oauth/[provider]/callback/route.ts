import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createSession, currentUser } from '@/lib/auth';
import { STATE_COOKIE, VERIFIER_COOKIE, appOrigin, finishAuth, isProvider, upsertOAuthUser } from '@/lib/oauth';

type Ctx = { params: Promise<{ provider: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { provider } = await params;
  const origin = appOrigin(req);
  const url = new URL(req.url);
  const jar = await cookies();
  const state = jar.get(STATE_COOKIE)?.value;
  const verifier = jar.get(VERIFIER_COOKIE)?.value ?? null;
  jar.delete(STATE_COOKIE);
  jar.delete(VERIFIER_COOKIE);

  const back = (error: string) => NextResponse.redirect(`${origin}/login?error=${error}`);
  if (!isProvider(provider)) return back('provider');
  // ผู้ใช้กดยกเลิกที่หน้ายินยอม
  if (url.searchParams.get('error')) return back('cancelled');
  const code = url.searchParams.get('code');
  if (!code || !state || url.searchParams.get('state') !== state) return back('state');

  try {
    const profile = await finishAuth(provider, origin, code, verifier);
    const me = await currentUser();
    const userId = await upsertOAuthUser(provider, profile, me?.id ?? null);
    if (!me || me.id !== userId) await createSession(userId);
  } catch (err) {
    console.error(`OAuth ${provider} callback failed`, err);
    return back('oauth');
  }
  return NextResponse.redirect(`${origin}/`);
}
