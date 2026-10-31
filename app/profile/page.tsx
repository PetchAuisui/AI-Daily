import { redirect } from 'next/navigation';
import Profile from '@/components/Profile';
import { currentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { TRACKER_COLS } from '@/lib/http';
import type { Tracker } from '@/lib/types';

export const metadata = { title: 'โปรไฟล์ · AI Daily' };

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect('/login');
  const [row, trackers] = await Promise.all([
    queryOne<{ created_at: Date }>('SELECT created_at FROM users WHERE id = $1', [user.id]),
    query<Tracker>(`SELECT ${TRACKER_COLS} FROM trackers WHERE user_id = $1 ORDER BY id`, [user.id]),
  ]);
  return <Profile user={user} memberSince={row ? new Date(row.created_at).toISOString() : null} initialTrackers={trackers} />;
}
