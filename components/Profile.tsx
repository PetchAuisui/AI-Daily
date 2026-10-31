'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { addDays, compute, statusOf, weekStartFor, type Budget, type Status } from '@/lib/budget';
import { dateTH, fmtU, timeTH } from '@/lib/format';
import { SPECIES_TH, mascotFor, parseMascot, type Mood } from '@/lib/mascots';
import type { Tracker, UsageEntry, User } from '@/lib/types';
import Mascot from './Mascot';
import TrackerDialog from './TrackerDialog';

type Props = { user: User; memberSince: string | null; initialTrackers: Tracker[] };

const MOOD: Record<Status, Mood> = { ok: 'happy', warn: 'worried', over: 'dizzy', off: 'sleepy' };
const STATUS_TH: Record<Status, string> = { ok: 'สบาย', warn: 'ใกล้ครบ', over: 'เกินงบ', off: 'วันพัก' };

export default function Profile({ user, memberSince, initialTrackers }: Props) {
  const [trackers, setTrackers] = useState(initialTrackers);
  const [budgets, setBudgets] = useState<Record<number, Budget>>({});
  const [dialog, setDialog] = useState<{ open: boolean; tracker: Tracker | null }>({ open: false, tracker: null });

  // คำนวณสรุปรอบนี้ของทุก AI หลัง mount (ใช้เวลาของ browser)
  useEffect(() => {
    let alive = true;
    const now = new Date();
    Promise.all(trackers.map(async (t) => {
      const start = weekStartFor(t, now);
      const entries = await api<UsageEntry[]>(`/api/trackers/${t.id}/usage?from=${+start}&to=${+addDays(start, 7)}`);
      return [t.id, compute(t, entries, start, now)] as const;
    })).then((rows) => { if (alive) setBudgets(Object.fromEntries(rows)); }).catch(() => {});
    return () => { alive = false; };
  }, [trackers]);

  async function onSaved() {
    setTrackers(await api<Tracker[]>('/api/trackers'));
    setDialog({ open: false, tracker: null });
  }

  const since = memberSince ? new Date(memberSince).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <section>
      <header className="topbar">
        <Link href="/" className="logo">🤖 AI Daily</Link>
        <div className="user">
          <Link href="/" className="btn ghost sm">‹ กลับหน้าหลัก</Link>
        </div>
      </header>

      <main className="container">
        <div className="card profile-head">
          <div className="avatar" aria-hidden>{initial(user.display_name)}</div>
          <div>
            <h2>{user.display_name}</h2>
            <div className="muted">@{user.username}</div>
            {since && <div className="muted sm">เป็นสมาชิกตั้งแต่ {since}</div>}
          </div>
          <div className="profile-count">
            <b>{trackers.length}</b>
            <span className="muted sm">AI ที่ติดตาม</span>
          </div>
        </div>

        <div className="card-head"><h3>เพื่อนร่วมทาง AI ของคุณ</h3></div>
        {!trackers.length ? (
          <div className="card empty">
            <p className="muted">ยังไม่มี AI ที่ติดตาม</p>
            <Link href="/" className="btn primary">ไปเพิ่ม AI ที่หน้าหลัก</Link>
          </div>
        ) : (
          <div className="mascot-grid">
            {trackers.map((t) => (
              <TrackerCard key={t.id} tracker={t} c={budgets[t.id]} onEdit={() => setDialog({ open: true, tracker: t })} />
            ))}
          </div>
        )}
      </main>

      <TrackerDialog open={dialog.open} tracker={dialog.tracker}
        onClose={() => setDialog({ open: false, tracker: null })} onSaved={onSaved} />
    </section>
  );
}

// ตัวอักษรแรกของชื่อ (ข้ามสระหน้าภาษาไทย เช่น "เพชร" → "พ")
function initial(name: string) {
  return [...name.trim().replace(/^[เแโใไ]/, '')][0]?.toUpperCase() ?? '?';
}

function TrackerCard({ tracker: t, c, onEdit }: { tracker: Tracker; c?: Budget; onEdit: () => void }) {
  const u = t.unit;
  const id = mascotFor(t);
  const st = c ? statusOf(c) : null;
  const pct = c ? Math.min(100, (c.used / c.L) * 100) : 0;
  return (
    <div className={`card mascot-card ${st ?? ''}`}>
      <div className="mascot-top">
        <div className="mascot-stage">
          <Mascot id={id} mood={st ? MOOD[st] : 'happy'} size={80} title={`${SPECIES_TH[parseMascot(id).species]} ของ ${t.name}`} />
        </div>
        <div className="mascot-info">
          <h3>{t.name}</h3>
          <div className="muted sm">โควต้า {fmtU(t.weekly_limit, u)} / สัปดาห์</div>
          {st && <span className={`badge ${st}`}>{STATUS_TH[st]}</span>}
        </div>
      </div>
      {c ? (
        <>
          <div className={`meter ${st === 'off' ? 'ok' : st}`}><span style={{ width: `${pct}%` }} /></div>
          <dl className="kv">
            <dt>ใช้ไปรอบนี้</dt><dd>{fmtU(c.used, u)} ({Math.round((c.used / c.L) * 100)}%)</dd>
            <dt>คงเหลือ</dt><dd>{fmtU(Math.max(0, c.remaining), u)}</dd>
            <dt>รีเซ็ตรอบหน้า</dt><dd>{dateTH(c.weekEnd)} {timeTH(c.weekEnd)}</dd>
          </dl>
        </>
      ) : (
        <p className="muted sm">กำลังโหลด…</p>
      )}
      <button className="btn ghost sm edit" onClick={onEdit}>เปลี่ยนตัวละคร / ตั้งค่า</button>
    </div>
  );
}
