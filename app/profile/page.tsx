import { redirect } from 'next/navigation';
import Profile from '@/components/Profile';
import { currentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { TRACKER_COLS } from '@/lib/http';
import { enabledProviders, loginMethods } from '@/lib/oauth';
import type { Tracker } from '@/lib/types';

export const metadata = { title: 'โปรไฟล์ · AI Daily' };

// ผลลัพธ์จาก OAuth callback ตอนเชื่อมบัญชี (?linked= / ?link_error=)
const LINK_ERRORS: Record<string, string> = {
  linked_elsewhere: 'บัญชีนี้ผูกกับผู้ใช้อื่นที่มีข้อมูลอยู่แล้ว หรือคุณเชื่อมบัญชีช่องทางนี้ไว้แล้ว',
  cancelled: 'ยกเลิกการเชื่อมบัญชีแล้ว',
  state: 'เซสชันหมดอายุ ลองกดเชื่อมใหม่อีกครั้ง',
  provider: 'ยังไม่ได้เปิดใช้ช่องทางนี้',
  oauth: 'เชื่อมบัญชีไม่สำเร็จ ลองใหม่อีกครั้ง',
};

type Search = Promise<{ linked?: string; link_error?: string }>;

export default async function ProfilePage({ searchParams }: { searchParams: Search }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { linked, link_error } = await searchParams;
  const [row, trackers, methods] = await Promise.all([
    queryOne<{ created_at: Date }>('SELECT created_at FROM users WHERE id = $1', [user.id]),
    query<Tracker>(`SELECT ${TRACKER_COLS} FROM trackers WHERE user_id = $1 ORDER BY id`, [user.id]),
    loginMethods(user.id),
  ]);
  const notice = link_error
    ? { tone: 'over' as const, text: LINK_ERRORS[link_error] ?? LINK_ERRORS.oauth }
    : linked ? { tone: 'ok' as const, text: 'เชื่อมบัญชีเรียบร้อย ครั้งหน้าเข้าสู่ระบบด้วยช่องทางนี้ได้เลย' } : null;
  return (
    <Profile user={user} memberSince={row ? new Date(row.created_at).toISOString() : null} initialTrackers={trackers}
      providers={enabledProviders()} initialAccounts={methods.accounts} hasPassword={methods.hasPassword} notice={notice} />
  );
}
