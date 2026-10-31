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

/** บัญชี OAuth นี้ผูกกับ user อื่นที่มีข้อมูลอยู่แล้ว — ไม่ย้ายให้เอง */
export class LinkedElsewhereError extends Error {}

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
  if (existing && linkTo != null && existing.user_id !== linkTo) {
    // ผูกอยู่กับ user อื่น: ย้ายมาได้เฉพาะเมื่อ user นั้นยังไม่มี AI ที่ติดตาม (เช่น เผลอกด login ด้วย Google ไว้ก่อน)
    const used = await queryOne('SELECT 1 FROM trackers WHERE user_id = $1 LIMIT 1', [existing.user_id]);
    if (used) throw new LinkedElsewhereError(`${p} account belongs to user ${existing.user_id}`);
    await query('UPDATE accounts SET user_id = $3, email = $4 WHERE provider = $1 AND provider_user_id = $2',
      [p, profile.id, linkTo, profile.email]);
    return linkTo;
  }
  if (existing) {
    await query('UPDATE accounts SET email = $3 WHERE provider = $1 AND provider_user_id = $2', [p, profile.id, profile.email]);
    return existing.user_id;
  }
  if (linkTo != null && await queryOne('SELECT 1 FROM accounts WHERE user_id = $1 AND provider = $2', [linkTo, p])) {
    // ผูก provider นี้ไว้แล้วกับบัญชีอื่นของ provider เดียวกัน — ให้ยกเลิกอันเดิมก่อน
    throw new LinkedElsewhereError(`user ${linkTo} already has a ${p} account`);
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

export type LinkedAccount = { provider: ProviderId; email: string | null };

/** บัญชี OAuth ที่ผูกกับ user + มีรหัสผ่านหรือไม่ (ใช้ตัดสินว่ายกเลิกการเชื่อมได้ไหม) */
export async function loginMethods(userId: number) {
  const [accounts, pw] = await Promise.all([
    query<LinkedAccount>('SELECT provider, email FROM accounts WHERE user_id = $1 ORDER BY created_at', [userId]),
    queryOne<{ has: boolean }>('SELECT password_hash IS NOT NULL AS has FROM users WHERE id = $1', [userId]),
  ]);
  return { accounts, hasPassword: !!pw?.has };
}

/** ยกเลิกการเชื่อม — ไม่ยอมถ้าเป็นช่องทางเข้าสู่ระบบสุดท้าย */
export async function unlinkAccount(userId: number, p: ProviderId): Promise<'ok' | 'missing' | 'last'> {
  const { accounts, hasPassword } = await loginMethods(userId);
  if (!accounts.some((a) => a.provider === p)) return 'missing';
  if (!hasPassword && accounts.length === 1) return 'last';
  await query('DELETE FROM accounts WHERE user_id = $1 AND provider = $2', [userId, p]);
  return 'ok';
}
