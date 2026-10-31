import 'server-only';
import { NextResponse } from 'next/server';
import { currentUser } from './auth';
import { queryOne } from './db';
import { isMascotId } from './mascots';
import type { Tracker, TrackerInput, User } from './types';

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === 'object' ? b : {};
  } catch {
    return {};
  }
}

/** คืน user หรือ Response 401 */
export async function requireUser(): Promise<User | Response> {
  const u = await currentUser();
  return u ?? fail('กรุณาเข้าสู่ระบบ', 401);
}

export const TRACKER_COLS = 'id, name, weekly_limit, unit, reset_dow, reset_hour, active_days, reserve_pct, mascot';

export function ownTracker(userId: number, id: number) {
  return queryOne<Tracker>(`SELECT ${TRACKER_COLS} FROM trackers WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export function cleanTracker(b: Record<string, unknown>): { tracker: TrackerInput } | { error: string } {
  const t: TrackerInput = {
    name: String(b.name ?? '').trim().slice(0, 60),
    weekly_limit: Number(b.weekly_limit),
    unit: String(b.unit ?? 'tokens').trim().slice(0, 20) || 'tokens',
    reset_dow: Number(b.reset_dow),
    reset_hour: Number(b.reset_hour),
    active_days: String(b.active_days ?? '1111111'),
    reserve_pct: Number(b.reserve_pct ?? 10),
    mascot: b.mascot == null || b.mascot === '' ? null : String(b.mascot),
  };
  if (!t.name) return { error: 'กรุณาตั้งชื่อ AI' };
  if (!(t.weekly_limit > 0)) return { error: 'โควต้ารายสัปดาห์ต้องมากกว่า 0' };
  if (!Number.isInteger(t.reset_dow) || t.reset_dow < 0 || t.reset_dow > 6) return { error: 'วันรีเซ็ตไม่ถูกต้อง' };
  if (!Number.isInteger(t.reset_hour) || t.reset_hour < 0 || t.reset_hour > 23) return { error: 'เวลารีเซ็ตไม่ถูกต้อง' };
  if (!/^[01]{7}$/.test(t.active_days) || !t.active_days.includes('1')) return { error: 'ต้องเลือกวันที่ใช้งานอย่างน้อย 1 วัน' };
  if (!(t.reserve_pct >= 0 && t.reserve_pct < 90)) return { error: 'เปอร์เซ็นต์สำรองต้องอยู่ระหว่าง 0–89' };
  if (t.mascot !== null && !isMascotId(t.mascot)) return { error: 'ตัวละครไม่ถูกต้อง' };
  return { tracker: t };
}
