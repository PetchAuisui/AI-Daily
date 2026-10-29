import { redirect } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import { currentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { TRACKER_COLS } from '@/lib/http';
import type { Tracker } from '@/lib/types';

export default async function Home({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const trackers = await query<Tracker>(`SELECT ${TRACKER_COLS} FROM trackers WHERE user_id = $1 ORDER BY id`, [user.id]);
  return <Dashboard user={user} initialTrackers={trackers} isNew={!!(await searchParams).new} />;
}
