import { query, queryOne } from '@/lib/db';
import { TRACKER_COLS, cleanTracker, fail, json, readBody, requireUser } from '@/lib/http';
import type { Tracker } from '@/lib/types';

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return json(await query<Tracker>(`SELECT ${TRACKER_COLS} FROM trackers WHERE user_id = $1 ORDER BY id`, [user.id]));
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const r = cleanTracker(await readBody(req));
  if ('error' in r) return fail(r.error);
  const t = r.tracker;
  const row = await queryOne<Tracker>(
    `INSERT INTO trackers (user_id, name, weekly_limit, unit, reset_dow, reset_hour, active_days, reserve_pct)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${TRACKER_COLS}`,
    [user.id, t.name, t.weekly_limit, t.unit, t.reset_dow, t.reset_hour, t.active_days, t.reserve_pct],
  );
  return json(row, 201);
}
