import { isLoadFactor, type DayLoads } from '@/lib/budget';
import { query } from '@/lib/db';
import { fail, json, ownTracker, readBody, requireUser } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// ระดับการใช้รายวันในช่วง [from, to] → { 'YYYY-MM-DD': factor }
export async function GET(req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const id = Number((await params).id);
  if (!(await ownTracker(user.id, id))) return fail('ไม่พบรายการ', 404);
  const sp = new URL(req.url).searchParams;
  const from = sp.get('from') ?? '0000-00-00';
  const to = sp.get('to') ?? '9999-99-99';
  const rows = await query<{ day: string; factor: number }>(
    'SELECT day, factor FROM day_loads WHERE tracker_id = $1 AND day >= $2 AND day <= $3',
    [id, from, to],
  );
  return json(Object.fromEntries(rows.map((r) => [r.day, r.factor])) as DayLoads);
}

// ตั้งระดับของวัน { day, factor } — factor 1 = ปกติ (ลบแถว)
export async function PUT(req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const id = Number((await params).id);
  if (!(await ownTracker(user.id, id))) return fail('ไม่พบรายการ', 404);
  const b = await readBody(req);
  const day = String(b.day ?? '');
  const factor = Number(b.factor);
  if (!DAY.test(day)) return fail('วันที่ไม่ถูกต้อง');
  if (!isLoadFactor(factor)) return fail('ระดับการใช้ไม่ถูกต้อง');
  if (factor === 1) await query('DELETE FROM day_loads WHERE tracker_id = $1 AND day = $2', [id, day]);
  else await query(
    `INSERT INTO day_loads (tracker_id, day, factor) VALUES ($1, $2, $3)
     ON CONFLICT (tracker_id, day) DO UPDATE SET factor = EXCLUDED.factor`,
    [id, day, factor],
  );
  return json({ ok: true });
}
