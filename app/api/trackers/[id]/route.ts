import { query, queryOne } from '@/lib/db';
import { TRACKER_COLS, cleanTracker, fail, json, ownTracker, readBody, requireUser } from '@/lib/http';
import type { Tracker } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const id = Number((await params).id);
  if (!(await ownTracker(user.id, id))) return fail('ไม่พบรายการ', 404);
  const r = cleanTracker(await readBody(req));
  if ('error' in r) return fail(r.error);
  const t = r.tracker;
  const row = await queryOne<Tracker>(
    `UPDATE trackers SET name=$1, weekly_limit=$2, unit=$3, reset_dow=$4, reset_hour=$5, active_days=$6, reserve_pct=$7
     WHERE id=$8 RETURNING ${TRACKER_COLS}`,
    [t.name, t.weekly_limit, t.unit, t.reset_dow, t.reset_hour, t.active_days, t.reserve_pct, id],
  );
  return json(row);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const id = Number((await params).id);
  if (!(await ownTracker(user.id, id))) return fail('ไม่พบรายการ', 404);
  await query('DELETE FROM trackers WHERE id = $1', [id]);
  return json({ ok: true });
}
