import { describe, expect, it } from 'vitest';
import { buddyAdvice, compute, statusOf, weekStartFor } from '@/lib/budget';
import type { Tracker, UsageEntry } from '@/lib/types';

// เวลาในเทสต์เป็นเวลาท้องถิ่น (สคริปต์ test ตั้ง TZ=Asia/Bangkok)
const tracker = (o: Partial<Tracker> = {}): Tracker => ({
  id: 1, name: 'Claude', weekly_limit: 100, unit: '%', reset_dow: 1, reset_hour: 19,
  active_days: '1111111', reserve_pct: 10, mascot: null, ...o,
});
let nextId = 1;
const use = (d: Date, amount: number): UsageEntry => ({ id: nextId++, tracker_id: 1, ts: +d, amount, note: '' });
const at = (day: number, hour: number) => new Date(2026, 9, day, hour); // ต.ค. 2026; 26 = จันทร์
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('weekStartFor', () => {
  it('ย้อนไปจันทร์ 19:00 ล่าสุด', () => {
    expect(weekStartFor(tracker(), at(31, 15))).toEqual(at(26, 19));
  });
  it('ก่อน 19:00 ของวันจันทร์ ยังเป็นรอบก่อน', () => {
    expect(weekStartFor(tracker(), at(26, 18))).toEqual(at(19, 19));
    expect(weekStartFor(tracker(), at(26, 19))).toEqual(at(26, 19));
  });
});

describe('compute: แบ่งช่วงตามวันในปฏิทิน', () => {
  it('รีเซ็ต 19:00 → 8 แท่ง แท่งแรก/สุดท้ายเป็นวันจันทร์ไม่เต็มวัน', () => {
    const c = compute(tracker(), [], at(26, 19), at(31, 15));
    expect(c.slices).toHaveLength(8);
    expect(c.slices[0]).toEqual({ start: at(26, 19), end: at(27, 0) });
    expect(c.slices[7]).toEqual({ start: new Date(2026, 10, 2, 0), end: new Date(2026, 10, 2, 19) });
    expect(c.weight[0]).toBeCloseTo(5 / 24);
    expect(c.weight[7]).toBeCloseTo(19 / 24);
    expect(sum(c.weight)).toBeCloseTo(7);
  });

  it('รีเซ็ตเที่ยงคืน → 7 แท่งเต็มวัน', () => {
    const c = compute(tracker({ reset_hour: 0 }), [], at(26, 0), at(31, 15));
    expect(c.slices).toHaveLength(7);
    expect(c.weight.every((w) => Math.abs(w - 1) < 1e-9)).toBe(true);
  });

  it('วันพักได้น้ำหนัก 0 และงบปกติหารเฉพาะวันใช้งาน', () => {
    // ใช้งาน จ–ศ เท่านั้น (index ตาม getDay: อา=0)
    const c = compute(tracker({ active_days: '0111110' }), [], at(26, 19), at(31, 15));
    expect(c.activeCount).toBe(5);
    expect(c.baseDaily).toBeCloseTo(90 / 5);
    c.slices.forEach((s, i) => {
      const off = s.start.getDay() === 0 || s.start.getDay() === 6;
      expect(c.weight[i] === 0).toBe(off);
    });
  });
});

describe('compute: งบรายวัน', () => {
  it('รอบที่ยังไม่ใช้เลย งบตั้งต้นรวม = โควต้าหักสำรอง', () => {
    const c = compute(tracker(), [], at(26, 19), at(26, 20));
    expect(c.usable).toBe(90);
    expect(c.baseDaily * sum(c.weight)).toBeCloseTo(90);
    expect(c.todayBudget).toBeCloseTo(90 * (5 / 24) / 7);
  });

  it('งบวันนี้/วันถัดไปคิดจากที่เหลือตามน้ำหนัก', () => {
    const entries = [use(at(26, 21), 3), use(at(27, 10), 9), use(at(28, 14), 20), use(at(29, 11), 13), use(at(30, 9), 1), use(at(31, 12), 2)];
    const c = compute(tracker(), entries, at(26, 19), at(31, 15));
    expect(c.used).toBe(48);
    expect(c.todayIdx).toBe(5);
    expect(c.usedToday).toBe(2);
    // ที่เหลือก่อนวันนี้ 90 - 46 = 44 แบ่งให้ ส + อา + จ(19/24)
    expect(c.todayBudget).toBeCloseTo(44 / (2 + 19 / 24));
    expect(c.nextDaily).toBeCloseTo((90 - 48) / (1 + 19 / 24));
    expect(statusOf(c)).toBe('ok');
  });

  it('ใช้เกินโควต้า → สถานะ over', () => {
    const c = compute(tracker(), [use(at(27, 10), 120)], at(26, 19), at(27, 12));
    expect(c.remaining).toBeLessThan(0);
    expect(statusOf(c)).toBe('over');
  });

  it('รอบที่จบแล้ว todayIdx = จำนวนแท่ง', () => {
    const c = compute(tracker(), [], at(26, 19), new Date(2026, 10, 3, 9));
    expect(c.isCurrent).toBe(false);
    expect(c.todayIdx).toBe(c.slices.length);
  });
});

describe('buddyAdvice: อารมณ์ตัวละคร', () => {
  const entries = (amount: number) => [use(at(27, 10), amount)];
  it.each([
    [1, 'happy'],
    [13, 'worried'],
    [30, 'dizzy'],
  ] as const)('วันนี้ใช้ %d%% → %s', (amount, mood) => {
    const c = compute(tracker(), entries(amount), at(26, 19), at(27, 23));
    expect(buddyAdvice(tracker(), c).mood).toBe(mood);
  });
  it('วันพัก → sleepy', () => {
    const c = compute(tracker({ active_days: '1101111' }), [], at(26, 19), at(27, 12));
    expect(buddyAdvice(tracker({ active_days: '1101111' }), c).mood).toBe('sleepy');
  });
});
