import 'server-only';
import { GitHub, Google, decodeIdToken, generateCodeVerifier, generateState } from 'arctic';
import { query, queryOne } from './db';

export type ProviderId = 'google' | 'github';
export const PROVIDERS: ProviderId[] = ['google', 'github'];

const ENV: Record<ProviderId, [string, string]> = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
};

export const STATE_COOKIE = 'oauth_state';
export const VERIFIER_COOKIE = 'oauth_verifier';

/** ข้อมูลที่ได้จาก provider หลังยืนยันตัวตน */
export type Profile = { id: string; email: string | null; name: string; login: string | null };

function creds(p: ProviderId) {
  const [idKey, secretKey] = ENV[p];
  const id = process.env[idKey];
  const secret = process.env[secretKey];
  return id && secret ? { id, secret } : null;
}

/** provider ที่ตั้ง client id/secret ไว้แล้ว — ใช้แสดงปุ่มในหน้า login */
export const enabledProviders = () => PROVIDERS.filter((p) => creds(p));

export const isProvider = (p: string): p is ProviderId => (PROVIDERS as string[]).includes(p);

/** APP_URL ใช้เมื่ออยู่หลัง proxy/โดเมนที่ต่างจาก request; ไม่ตั้งก็ใช้ origin ของ request */
export function appOrigin(req: Request) {
  return (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');
}

function client(p: ProviderId, origin: string) {
  const c = creds(p);
  if (!c) return null;
  const redirect = `${origin}/api/auth/oauth/${p}/callback`;
  return p === 'google' ? new Google(c.id, c.secret, redirect) : new GitHub(c.id, c.secret, redirect);
}

/** สร้าง URL ไปหน้ายินยอมของ provider + ค่าที่ต้องเก็บใน cookie */
export function startAuth(p: ProviderId, origin: string) {
  const c = client(p, origin);
  if (!c) return null;
  const state = generateState();
  if (c instanceof Google) {
    const verifier = generateCodeVerifier();
    return { url: c.createAuthorizationURL(state, verifier, ['openid', 'profile', 'email']), state, verifier };
  }
  return { url: c.createAuthorizationURL(state, ['read:user', 'user:email']), state, verifier: null };
}

export async function finishAuth(p: ProviderId, origin: string, code: string, verifier: string | null): Promise<Profile> {
  const c = client(p, origin);
  if (!c) throw new Error(`${p} is not configured`);
  if (c instanceof Google) {
    if (!verifier) throw new Error('missing code verifier');
    const tokens = await c.validateAuthorizationCode(code, verifier);
    // id token มาจาก token endpoint ของ Google โดยตรงผ่าน TLS จึง decode ได้โดยไม่ต้อง verify ลายเซ็น
    const claims = decodeIdToken(tokens.idToken()) as { sub: string; email?: string; email_verified?: boolean; name?: string };
    const email = claims.email && claims.email_verified ? claims.email : null;
    return { id: claims.sub, email, name: claims.name || email?.split('@')[0] || 'Google user', login: null };
  }
  const tokens = await c.validateAuthorizationCode(code);
  const gh = (path: string) =>
    fetch(`https://api.github.com${path}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken()}`, 'User-Agent': 'ai-daily', Accept: 'application/vnd.github+json' },
    }).then((r) => {
      if (!r.ok) throw new Error(`GitHub ${path}: HTTP ${r.status}`);
      return r.json();
    });
  const user = (await gh('/user')) as { id: number; login: string; name: string | null };
  const emails = (await gh('/user/emails').catch(() => [])) as { email: string; primary: boolean; verified: boolean }[];
  const email = emails.find((e) => e.primary && e.verified)?.email ?? null;
  return { id: String(user.id), email, name: user.name || user.login, login: user.login };
}

/**
 * หา user ที่ผูกกับบัญชี OAuth นี้ ถ้ายังไม่มี:
 * - ถ้ามีคน login อยู่ (linkTo) → ผูกเข้ากับบัญชีนั้น
 * - ไม่งั้นสร้าง user ใหม่ (ไม่มีรหัสผ่าน)
 * ไม่ผูกอัตโนมัติด้วยอีเมล เพราะการสมัครด้วยรหัสผ่านไม่ได้ยืนยันอีเมล — ใครก็จองอีเมลคนอื่นไว้ก่อนได้
 */
export async function upsertOAuthUser(p: ProviderId, profile: Profile, linkTo: number | null): Promise<number> {
  const existing = await queryOne<{ user_id: number }>(
    'SELECT user_id FROM accounts WHERE provider = $1 AND provider_user_id = $2',
    [p, profile.id],
  );
  if (existing) {
    await query('UPDATE accounts SET email = $3 WHERE provider = $1 AND provider_user_id = $2', [p, profile.id, profile.email]);
    return existing.user_id;
  }
  let userId = linkTo;
  if (userId == null) {
    const candidates = [profile.email, profile.login, `${p}_${profile.id}`].filter((u): u is string => !!u);
    for (const username of candidates) {
      const row = await queryOne<{ id: number }>(
        `INSERT INTO users (username, display_name) VALUES ($1, $2)
         ON CONFLICT (lower(username)) DO NOTHING RETURNING id`,
        [username, profile.name.slice(0, 40)],
      );
      if (row) { userId = row.id; break; }
    }
    if (userId == null) throw new Error('could not allocate username');
  }
  await query(
    'INSERT INTO accounts (provider, provider_user_id, user_id, email) VALUES ($1, $2, $3, $4)',
    [p, profile.id, userId, profile.email],
  );
  return userId;
}
