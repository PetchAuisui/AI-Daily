'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { addDays, buddyAdvice, compute, statusOf, weekStartFor, type Budget, type Tip } from '@/lib/budget';
import { dateTH, fmt, fmtU, timeTH } from '@/lib/format';
import type { Tracker, UsageEntry, User } from '@/lib/types';
import TrackerDialog from './TrackerDialog';
import UsageForm from './UsageForm';
import WeekChart from './WeekChart';

const STORE_KEY = 'aidaily.tracker';

function storeGet() { try { return Number(localStorage.getItem(STORE_KEY)); } catch { return NaN; } }
function storeSet(id: number) { try { localStorage.setItem(STORE_KEY, String(id)); } catch { /* ignore */ } }

type Props = { user: User; initialTrackers: Tracker[]; isNew?: boolean };

export default function Dashboard({ user, initialTrackers, isNew }: Props) {
  const router = useRouter();
  const [trackers, setTrackers] = useState(initialTrackers);
  const [currentId, setCurrentId] = useState<number | null>(initialTrackers[0]?.id ?? null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState<UsageEntry[]>([]);
  // now = null จนกว่าจะ mount เพื่อเลี่ยง hydration mismatch (เวลา server ≠ browser)
  const [now, setNow] = useState<Date | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; tracker: Tracker | null }>({ open: false, tracker: null });

  const tracker = trackers.find((t) => t.id === currentId) ?? null;

  useEffect(() => {
    setNow(new Date());
    const saved = storeGet();
    if (initialTrackers.some((t) => t.id === saved)) setCurrentId(saved);
    if (isNew && !initialTrackers.length) setDialog({ open: true, tracker: null });
    // อัปเดตทุกนาที (เวลาที่เหลือ/pace เปลี่ยนตามเวลา)
    const iv = setInterval(() => { if (!document.hidden) setNow(new Date()); }, 60_000);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const weekStart = tracker && now ? addDays(weekStartFor(tracker, now), weekOffset * 7) : null;
  const weekStartMs = weekStart ? +weekStart : null;
  const trackerId = tracker?.id ?? null;

  const loadEntries = useCallback(async () => {
    if (trackerId == null || weekStartMs == null) return setEntries([]);
    const to = +addDays(new Date(weekStartMs), 7);
    setEntries(await api<UsageEntry[]>(`/api/trackers/${trackerId}/usage?from=${weekStartMs}&to=${to}`));
  }, [trackerId, weekStartMs]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  function selectTracker(id: number | null) {
    setCurrentId(id);
    setWeekOffset(0);
    if (id) storeSet(id);
  }

  async function onTrackerSaved(saved: Tracker | null) {
    const list = await api<Tracker[]>('/api/trackers');
    setTrackers(list);
    setDialog({ open: false, tracker: null });
    selectTracker(saved?.id ?? list[0]?.id ?? null);
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  async function deleteEntry(id: number) {
    if (!confirm('ลบรายการนี้?')) return;
    await api(`/api/usage/${id}`, { method: 'DELETE' });
    loadEntries();
  }

  const c = tracker && weekStart && now ? compute(tracker, entries, weekStart, now) : null;

  return (
    <section>
      <header className="topbar">
        <div className="logo">🤖 AI Daily</div>
        <div className="user">
          <span>สวัสดี {user.display_name} 👋</span>
          <button className="btn ghost sm" onClick={logout}>ออกจากระบบ</button>
        </div>
      </header>

      <main className="container">
        {!tracker ? (
          <div className="card empty">
            <h2>ยังไม่มี AI ที่ติดตาม</h2>
            <p className="muted">เพิ่ม AI ที่มีโควต้ารายสัปดาห์ (เช่น Claude, ChatGPT, Cursor) แล้วเริ่มบันทึกการใช้ได้เลย</p>
            <button className="btn primary" onClick={() => setDialog({ open: true, tracker: null })}>+ เพิ่ม AI ตัวแรก</button>
          </div>
        ) : (
          <>
            <nav className="tracker-tabs">
              {trackers.map((t) => (
                <button key={t.id} className={t.id === currentId ? 'active' : ''} onClick={() => selectTracker(t.id)}>{t.name}</button>
              ))}
              <button className="add" onClick={() => setDialog({ open: true, tracker: null })}>+ เพิ่ม AI</button>
            </nav>

            {c && weekStart && (
              <>
                <div className="week-nav">
                  <button className="btn ghost sm" onClick={() => setWeekOffset((w) => w - 1)}>‹ สัปดาห์ก่อน</button>
                  <div className="week-label">
                    {dateTH(weekStart)} – {dateTH(new Date(+c.weekEnd - 1))}
                    {weekOffset === 0 && <> <span className="muted sm">(สัปดาห์นี้)</span></>}
                  </div>
                  <button className="btn ghost sm" style={{ visibility: weekOffset >= 0 ? 'hidden' : 'visible' }}
                    onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}>สัปดาห์ถัดไป ›</button>
                </div>

                <Buddy tracker={tracker} c={c} />
                <Stats tracker={tracker} c={c} />

                <div className="grid-2">
                  <Today tracker={tracker} c={c} />
                  <div className="card">
                    <div className="card-head"><h3>บันทึกการใช้</h3></div>
                    <UsageForm tracker={tracker} onSaved={loadEntries} />
                  </div>
                </div>

                <div className="card">
                  <div className="card-head">
                    <h3>ยอดสะสมรอบนี้</h3>
                    <div className="legend">
                      <span><i className="sw sw-prev" />สะสมก่อนหน้า</span>
                      <span><i className="sw sw-ok" />วันนั้น</span>
                      <span><i className="sw sw-over" />เกินแผน</span>
                      <span><i className="sw sw-line" />แผนสะสม</span>
                    </div>
                  </div>
                  <WeekChart c={c} unit={tracker.unit} />
                </div>

                <div className="card">
                  <div className="card-head">
                    <h3>ประวัติการบันทึก</h3>
                    <button className="btn ghost sm" onClick={() => setDialog({ open: true, tracker })}>⚙︎ ตั้งค่า AI นี้</button>
                  </div>
                  <Entries entries={entries} unit={tracker.unit} onDelete={deleteEntry} />
                </div>
              </>
            )}
          </>
        )}
      </main>

      <TrackerDialog open={dialog.open} tracker={dialog.tracker}
        onClose={() => setDialog({ open: false, tracker: null })} onSaved={onTrackerSaved} />
    </section>
  );
}

function TipLine({ tip }: { tip: Tip }) {
  return <li>{tip.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : <b key={i}>{p.b}</b>))}</li>;
}

function Buddy({ tracker, c }: { tracker: Tracker; c: Budget }) {
  const a = buddyAdvice(tracker, c);
  return (
    <div className={`buddy card ${a.tone}`}>
      <div className="face">{a.face}</div>
      <div className="msg">
        <h2>{a.title}</h2>
        {a.tips.length > 0 && <ul>{a.tips.map((t, i) => <TipLine key={i} tip={t} />)}</ul>}
      </div>
    </div>
  );
}

function Stats({ tracker, c }: { tracker: Tracker; c: Budget }) {
  const u = tracker.unit;
  const items: [string, string, string][] = [
    ['ใช้ไปแล้ว', fmtU(c.used, u), `${Math.min(100, (c.used / c.L) * 100).toFixed(0)}% ของ ${fmtU(c.L, u)}`],
    ['คงเหลือ', fmtU(Math.max(0, c.remaining), u), `สำรองไว้ ${fmtU(c.reserve, u)}`],
    ['งบปกติต่อวัน', fmtU(c.baseDaily, u), `${c.activeCount} วันใช้งาน/สัปดาห์`],
    ['ตามแผนควรใช้ถึงตอนนี้', fmtU(c.expected, u),
      !c.isCurrent ? '—' : c.used > c.expected ? `เร็วกว่าแผน ${fmtU(c.used - c.expected, u)}` : `ยังเหลือจากแผน ${fmtU(c.expected - c.used, u)}`],
  ];
  return (
    <div className="stats">
      {items.map(([k, v, s]) => (
        <div className="stat" key={k}><div className="k">{k}</div><div className="v">{v}</div><div className="s">{s}</div></div>
      ))}
    </div>
  );
}

const BADGE: Record<string, string> = { ok: 'สบาย', warn: 'ใกล้ครบ', over: 'เกินงบ' };

function Today({ tracker, c }: { tracker: Tracker; c: Budget }) {
  const u = tracker.unit;
  const st = c.isCurrent ? statusOf(c) : 'off';
  const meterMax = Math.max(c.todayBudget, c.usedToday) || 1;
  const ratio = c.todayBudget > 0 ? c.usedToday / c.todayBudget : c.usedToday > 0 ? 1 : 0;
  return (
    <div className="card">
      <div className="card-head">
        <h3>วันนี้</h3>
        <span className={`badge ${st}`}>{BADGE[st] ?? (c.isCurrent ? 'วันพัก' : '—')}</span>
      </div>
      {c.isCurrent ? (
        <>
          <div className="today-big">{fmt(c.usedToday, u)} <small>/ {fmtU(c.todayBudget, u)}</small></div>
          <div className={`meter ${st}`}>
            <span style={{ width: `${Math.min(100, (c.usedToday / meterMax) * 100)}%` }} />
            {c.usedToday > c.todayBudget && c.todayBudget > 0 && <i className="mark" style={{ left: `${(c.todayBudget / meterMax) * 100}%` }} />}
          </div>
          <div className="muted sm">{c.todayActive ? `ใช้ไป ${Math.round(ratio * 100)}% ของงบวันนี้` : 'วันนี้ไม่ได้อยู่ในวันใช้งาน'}</div>
          <dl className="kv">
            <dt>งบวันนี้ (ปรับตามที่เหลือจริง)</dt><dd>{fmtU(c.todayBudget, u)}</dd>
            <dt>เหลือใช้ได้วันนี้</dt><dd>{fmtU(Math.max(0, c.todayBudget - c.usedToday), u)}</dd>
            <dt>งบ/วัน สำหรับวันถัดไป</dt><dd>{c.activeAfterToday ? fmtU(c.nextDaily, u) : '—'}</dd>
            <dt>รีเซ็ตรอบหน้า</dt><dd>{dateTH(c.weekEnd)} {timeTH(c.weekEnd)}</dd>
          </dl>
        </>
      ) : (
        <p className="muted">กำลังดูสัปดาห์ย้อนหลัง — สรุปอยู่ด้านบนและกราฟด้านล่าง</p>
      )}
    </div>
  );
}

function Entries({ entries, unit, onDelete }: { entries: UsageEntry[]; unit: string; onDelete: (id: number) => void }) {
  if (!entries.length) return <p className="muted">ยังไม่มีการบันทึกในสัปดาห์นี้</p>;
  return (
    <div>
      {[...entries].sort((a, b) => b.ts - a.ts).map((e) => {
        const d = new Date(e.ts);
        return (
          <div className="entry" key={e.id}>
            <span className="when">{dateTH(d)} {timeTH(d)}</span>
            <span className="amt">{e.amount > 0 ? '+' : ''}{fmt(e.amount, unit)}</span>
            <span className="note" title={e.note}>{e.note || '—'}</span>
            <button className="del" title="ลบ" onClick={() => onDelete(e.id)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}
