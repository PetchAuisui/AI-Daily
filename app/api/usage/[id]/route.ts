import { query, queryOne } from '@/lib/db';
import { fail, json, requireUser } from '@/lib/http';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const row = await queryOne<{ id: number }>(
    `SELECT u.id FROM usage u JOIN trackers t ON t.id = u.tracker_id WHERE u.id = $1 AND t.user_id = $2`,
    [Number((await params).id), user.id],
  );
  if (!row) return fail('ไม่พบรายการ', 404);
  await query('DELETE FROM usage WHERE id = $1', [row.id]);
  return json({ ok: true });
}
