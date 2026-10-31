import fs from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Profile } from '@/lib/oauth';

// เทสต์กับฐานข้อมูลจริง: รันเฉพาะเมื่อตั้ง TEST_DATABASE_URL (CI มี Postgres service ให้) — ข้อมูลในนั้นถูกล้างทุกเทสต์
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('เชื่อมบัญชี OAuth', () => {
  let db: typeof import('@/lib/db');
  let oauth: typeof import('@/lib/oauth');

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    db = await import('@/lib/db');
    oauth = await import('@/lib/oauth');
    await db.query(fs.readFileSync('db/schema.sql', 'utf8'));
  });
  beforeEach(() => db.query('TRUNCATE users, accounts, sessions, trackers, usage RESTART IDENTITY CASCADE'));
  afterAll(async () => {
    await (globalThis as unknown as { __pgPool?: { end(): Promise<void> } }).__pgPool?.end();
  });

  const google: Profile = { id: 'g-123', email: 'me@gmail.com', name: 'Me', login: null };
  const passwordUser = async (username = 'me') =>
    (await db.queryOne<{ id: number }>(
      `INSERT INTO users (username, display_name, password_hash, salt) VALUES ($1, $1, 'h', 's') RETURNING id`, [username],
    ))!.id;
  const addTracker = (userId: number) =>
    db.query(`INSERT INTO trackers (user_id, name, weekly_limit) VALUES ($1, 'Claude', 100)`, [userId]);

  it('login ด้วย Google ครั้งแรก (ไม่ได้ login อยู่) สร้างผู้ใช้ใหม่', async () => {
    const id = await oauth.upsertOAuthUser('google', google, null);
    const u = await db.queryOne<{ username: string; password_hash: string | null }>('SELECT username, password_hash FROM users WHERE id = $1', [id]);
    expect(u).toEqual({ username: 'me@gmail.com', password_hash: null });
  });

  it('login อยู่แล้วกดเชื่อม → ผูกกับบัญชีเดิม และ login ด้วย Google ครั้งต่อไปได้บัญชีเดิม', async () => {
    const me = await passwordUser();
    expect(await oauth.upsertOAuthUser('google', google, me)).toBe(me);
    expect(await oauth.upsertOAuthUser('google', google, null)).toBe(me);
    expect((await oauth.loginMethods(me)).accounts).toEqual([{ provider: 'google', email: 'me@gmail.com' }]);
  });

  it('Google เคยสร้างผู้ใช้เปล่าไว้ → ย้ายมาผูกกับบัญชีที่ login อยู่ได้', async () => {
    const stray = await oauth.upsertOAuthUser('google', google, null);
    const me = await passwordUser('old');
    expect(await oauth.upsertOAuthUser('google', google, me)).toBe(me);
    expect(await oauth.upsertOAuthUser('google', google, null)).toBe(me);
    expect(stray).not.toBe(me);
  });

  it('Google ผูกกับผู้ใช้อื่นที่มีข้อมูลแล้ว → ไม่ย้าย และไม่สลับบัญชี', async () => {
    const other = await oauth.upsertOAuthUser('google', google, null);
    await addTracker(other);
    const me = await passwordUser('old');
    await expect(oauth.upsertOAuthUser('google', google, me)).rejects.toBeInstanceOf(oauth.LinkedElsewhereError);
    expect(await oauth.upsertOAuthUser('google', google, null)).toBe(other);
  });

  it('เชื่อม Google คนละบัญชีซ้ำกับผู้ใช้เดียวกันไม่ได้', async () => {
    const me = await passwordUser();
    await oauth.upsertOAuthUser('google', google, me);
    await expect(oauth.upsertOAuthUser('google', { ...google, id: 'g-999' }, me)).rejects.toBeInstanceOf(oauth.LinkedElsewhereError);
  });

  it('ยกเลิกการเชื่อมได้ถ้ายังมีรหัสผ่าน แต่ห้ามยกเลิกช่องทางสุดท้าย', async () => {
    const me = await passwordUser();
    await oauth.upsertOAuthUser('google', google, me);
    expect(await oauth.unlinkAccount(me, 'google')).toBe('ok');
    expect(await oauth.unlinkAccount(me, 'google')).toBe('missing');

    const oauthOnly = await oauth.upsertOAuthUser('google', { ...google, id: 'g-2', email: 'x@gmail.com' }, null);
    expect(await oauth.unlinkAccount(oauthOnly, 'google')).toBe('last');
  });
});
