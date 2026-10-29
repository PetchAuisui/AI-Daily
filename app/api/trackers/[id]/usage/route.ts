import { query, queryOne } from '@/lib/db';
import { fail, json, ownTracker, readBody, requireUser } from '@/lib/http';
import type { UsageEntry } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };
const COLS = 'id, tracker_id, ts, amount, note';

export async function GET(req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const id = Number((await params).id);
  if (!(await ownTracker(user.id, id))) return fail('ไม่พบรายการ', 404);
  const sp = new URL(req.url).searchParams;
  const from = Number(sp.get('from')) || 0;
  const to = Number(sp.get('to')) || 8.64e15;
  return json(await query<UsageEntry>(
    `SELECT ${COLS} FROM usage WHERE tracker_id = $1 AND ts >= $2 AND ts < $3 ORDER BY ts`,
    [id, from, to],
  ));
}

export async function POST(req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const id = Number((await params).id);
  if (!(await ownTracker(user.id, id))) return fail('ไม่พบรายการ', 404);
  const b = await readBody(req);
  const amount = Number(b.amount);
  const ts = Math.round(Number(b.ts)) || Date.now();
  if (!Number.isFinite(amount) || amount === 0) return fail('จำนวนต้องเป็นตัวเลขที่ไม่ใช่ 0');
  const row = await queryOne<UsageEntry>(
    `INSERT INTO usage (tracker_id, ts, amount, note) VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
    [id, ts, amount, String(b.note ?? '').slice(0, 200)],
  );
  return json(row, 201);
}
