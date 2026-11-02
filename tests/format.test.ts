import { describe, expect, it } from 'vitest';
import { fmt, fmtU, isPct, toLocalInput } from '@/lib/format';

describe('fmt', () => {
  it('หน่วย % ปัดตามขนาด', () => {
    expect(fmt(22.4, '%')).toBe('22%');
    expect(fmt(1.83, '%')).toBe('1.8%');
    expect(fmt(0, '%')).toBe('0.0%');
    expect(fmt(0.456, '%')).toBe('0.46%');
  });
  it('หน่วยอื่นย่อเป็น K/M/B', () => {
    expect(fmt(950, 'tokens')).toBe('950');
    expect(fmt(1500, 'tokens')).toBe('1.5K');
    expect(fmt(25_000, 'tokens')).toBe('25K');
    expect(fmt(2_500_000, 'tokens')).toBe('2.50M');
    expect(fmt(12_300_000, 'tokens')).toBe('12.3M');
    expect(fmt(3_210_000_000, 'tokens')).toBe('3.21B');
    expect(fmtU(1500, 'tokens')).toBe('1.5K tokens');
  });
  it('ค่าติดลบใช้เกณฑ์ย่อเดียวกับค่าบวก', () => {
    expect(fmt(-1500, 'tokens')).toBe('-1.5K');
    expect(fmt(-22.4, '%')).toBe('-22%');
  });
  it('ค่าที่ไม่ใช่ตัวเลขจริงแสดงเป็นขีด', () => {
    expect(fmt(NaN, 'tokens')).toBe('–');
    expect(fmt(Infinity, '%')).toBe('–');
  });
});

describe('fmtU / isPct', () => {
  it('หน่วย % ไม่ต่อท้ายชื่อหน่วยซ้ำ และไม่สนช่องว่าง', () => {
    expect(isPct(' % ')).toBe(true);
    expect(isPct('tokens')).toBe(false);
    expect(fmtU(42, '%')).toBe('42%');
  });
});

describe('toLocalInput', () => {
  it('แปลงเป็นรูปแบบของ <input type="datetime-local"> ตามเวลาท้องถิ่น', () => {
    expect(toLocalInput(new Date(2026, 10, 2, 9, 5))).toBe('2026-11-02T09:05');
    expect(toLocalInput(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01T00:00');
  });
});
