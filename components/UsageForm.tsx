'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { addDays, weekStartFor } from '@/lib/budget';
import { fmt, fmtU, toLocalInput } from '@/lib/format';
import type { Tracker, UsageEntry } from '@/lib/types';

export default function UsageForm({ tracker, onSaved }: { tracker: Tracker; onSaved: () => void }) {
  const [mode, setMode] = useState<'add' | 'total'>('add');
  const [amount, setAmount] = useState('');
  const [ts, setTs] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setTs(toLocalInput(new Date())); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const val = Number(amount);
    const when = ts ? +new Date(ts) : Date.now();
    try {
      let delta = val;
      if (mode === 'total') {
        // ยอดรวมของสัปดาห์ที่ timestamp นี้อยู่ → บันทึกเฉพาะส่วนต่าง
        const ws = weekStartFor(tracker, new Date(when));
        const rows = await api<UsageEntry[]>(`/api/trackers/${tracker.id}/usage?from=${+ws}&to=${+addDays(ws, 7)}`);
        const sum = rows.filter((r) => r.ts <= when).reduce((a, r) => a + r.amount, 0);
        delta = val - sum;
        if (Math.abs(delta) < 1e-9) throw new Error(`ยอดรวมตรงกับที่บันทึกไว้แล้ว (${fmtU(sum, tracker.unit)})`);
      }
      await api(`/api/trackers/${tracker.id}/usage`, {
        method: 'POST',
        body: { amount: delta, ts: when, note: note || (mode === 'total' ? `อัปเดตยอดรวม → ${fmt(val, tracker.unit)}` : '') },
      });
      setAmount('');
      setNote('');
      setTs(toLocalInput(new Date()));
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="seg">
        <button type="button" className={mode === 'add' ? 'active' : ''} onClick={() => setMode('add')}>+ เพิ่มที่ใช้ไป</button>
        <button type="button" className={mode === 'total' ? 'active' : ''} onClick={() => setMode('total')}>ยอดรวมสัปดาห์ตอนนี้</button>
      </div>
      <p className="hint">
        {mode === 'add'
          ? 'ใส่จำนวนที่เพิ่งใช้ไป (เช่น งานนี้ใช้ไป 3%)'
          : 'ใส่ยอดรวมที่เห็นในหน้า Usage ตอนนี้ (เช่น 42%) ระบบจะคำนวณส่วนต่างให้เอง'}
      </p>
      <div className="row">
        <label className="grow">จำนวน ({tracker.unit})
          <input name="amount" type="number" step="any" required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="grow">เวลา
          <input name="ts" type="datetime-local" value={ts} onChange={(e) => setTs(e.target.value)} />
        </label>
      </div>
      <label>โน้ต (ไม่บังคับ)
        <input name="note" maxLength={200} placeholder="เช่น refactor โปรเจกต์ A" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <p className="error">{error}</p>
      <button className="btn primary full" type="submit" disabled={busy}>บันทึก</button>
    </form>
  );
}
