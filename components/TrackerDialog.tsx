'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { DOW_TH, DOW_TH_FULL } from '@/lib/format';
import { COLORS, COLOR_TH, PALETTE, SPECIES, SPECIES_TH, mascotFor, parseMascot } from '@/lib/mascots';
import type { Tracker, TrackerInput } from '@/lib/types';
import Mascot from './Mascot';

type Props = {
  open: boolean;
  tracker: Tracker | null; // null = เพิ่มใหม่
  onClose: () => void;
  onSaved: (t: Tracker | null) => void; // null = ลบแล้ว
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // แสดง จ–อา

function defaults(): TrackerInput {
  const now = new Date();
  return { name: '', weekly_limit: 100, unit: '%', reset_dow: now.getDay(), reset_hour: now.getHours(), active_days: '1111111', reserve_pct: 10, mascot: null };
}

export default function TrackerDialog({ open, tracker, onClose, onSaved }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [v, setV] = useState<TrackerInput>(defaults);
  const [error, setError] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      setV(tracker ? { ...tracker } : defaults());
      setError('');
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
  }, [open, tracker]);

  const set = <K extends keyof TrackerInput>(k: K, val: TrackerInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const toggleDay = (dow: number) =>
    set('active_days', v.active_days.split('').map((c, i) => (i === dow ? (c === '1' ? '0' : '1') : c)).join(''));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const saved = tracker
        ? await api<Tracker>(`/api/trackers/${tracker.id}`, { method: 'PUT', body: v })
        : await api<Tracker>('/api/trackers', { method: 'POST', body: v });
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onDelete() {
    if (!tracker || !confirm(`ลบ "${tracker.name}" และประวัติทั้งหมด?`)) return;
    await api(`/api/trackers/${tracker.id}`, { method: 'DELETE' });
    onSaved(null);
  }

  return (
    <dialog ref={ref} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <h2>{tracker ? 'ตั้งค่า AI' : 'เพิ่ม AI'}</h2>
        {!tracker && (
          <div className="presets">
            <span className="muted sm">ตั้งค่าเร็ว:</span>
            <button type="button" className="chip" onClick={() => setV((p) => ({ ...p, weekly_limit: 100, unit: '%' }))}>นับเป็น % (เช่นหน้า Usage ของ Claude)</button>
            <button type="button" className="chip" onClick={() => setV((p) => ({ ...p, weekly_limit: 5_000_000, unit: 'tokens' }))}>นับเป็น tokens</button>
          </div>
        )}
        <label>ชื่อ AI / แพลน
          <input required maxLength={60} placeholder="เช่น Claude Max" value={v.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <div className="row">
          <label className="grow">โควต้าต่อสัปดาห์
            <input type="number" step="any" min="0" required value={v.weekly_limit} onChange={(e) => set('weekly_limit', Number(e.target.value))} />
          </label>
          <label className="grow">หน่วย
            <input maxLength={20} required placeholder="% หรือ tokens" value={v.unit} onChange={(e) => set('unit', e.target.value)} />
          </label>
        </div>
        <div className="row">
          <label className="grow">รีเซ็ตทุกวัน
            <select value={v.reset_dow} onChange={(e) => set('reset_dow', Number(e.target.value))}>
              {DOW_TH_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </label>
          <label className="grow">เวลา (ชั่วโมง)
            <select value={v.reset_hour} onChange={(e) => set('reset_hour', Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </label>
        </div>
        <fieldset>
          <legend>วันที่ตั้งใจจะใช้ (งบจะแบ่งเฉพาะวันเหล่านี้)</legend>
          <div className="days">
            {DAY_ORDER.map((d) => (
              <button type="button" key={d} title={DOW_TH_FULL[d]} className={v.active_days[d] === '1' ? 'on' : ''} onClick={() => toggleDay(d)}>
                {DOW_TH[d]}
              </button>
            ))}
          </div>
        </fieldset>
        <MascotPicker value={v.mascot} auto={mascotFor({ id: tracker?.id, name: v.name })} onChange={(m) => set('mascot', m)} />
        <label>กันสำรองไว้ (%) <span className="muted sm">— เผื่อวันฉุกเฉิน ไม่นำมาแบ่งรายวัน</span>
          <input type="number" min="0" max="89" step="1" required value={v.reserve_pct} onChange={(e) => set('reserve_pct', Number(e.target.value))} />
        </label>
        <p className="error">{error}</p>
        <div className="dialog-actions">
          {tracker && <button type="button" className="btn danger ghost" onClick={onDelete}>ลบ</button>}
          <span className="grow" />
          <button type="button" className="btn ghost" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn primary">บันทึก</button>
        </div>
      </form>
    </dialog>
  );
}

// ยังไม่เคยเลือก (mascot = null) → ไฮไลต์ตัวที่สุ่มจากชื่อไว้ ซึ่งเป็นตัวเดียวกับที่แสดงอยู่
function MascotPicker({ value, auto, onChange }: { value: string | null; auto: string; onChange: (m: string) => void }) {
  const { species, color } = parseMascot(value ?? auto);
  return (
    <fieldset className="mascot-picker">
      <legend>ตัวละครประจำ AI</legend>
      <div className="mascot-row">
        {SPECIES.map((s) => (
          <button type="button" key={s} className={`mascot-opt${s === species ? ' on' : ''}`} title={SPECIES_TH[s]}
            onClick={() => onChange(`${s}-${color}`)}>
            <Mascot id={`${s}-${color}`} size={40} />
            <span>{SPECIES_TH[s]}</span>
          </button>
        ))}
      </div>
      <div className="swatches">
        {COLORS.map((c) => (
          <button type="button" key={c} title={COLOR_TH[c]} aria-label={`สี${COLOR_TH[c]}`} style={{ background: PALETTE[c].body }}
            className={c === color ? 'on' : ''} onClick={() => onChange(`${species}-${c}`)} />
        ))}
      </div>
    </fieldset>
  );
}
