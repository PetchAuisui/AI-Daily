import { describe, expect, it } from 'vitest';
import { fmt, fmtU } from '@/lib/format';

describe('fmt', () => {
  it('หน่วย % ปัดตามขนาด', () => {
    expect(fmt(22.4, '%')).toBe('22%');
    expect(fmt(1.83, '%')).toBe('1.8%');
    expect(fmt(0, '%')).toBe('0.0%');
  });
  it('หน่วยอื่นย่อเป็น K/M/B', () => {
    expect(fmt(950, 'tokens')).toBe('950');
    expect(fmt(1500, 'tokens')).toBe('1.5K');
    expect(fmt(2_500_000, 'tokens')).toBe('2.50M');
    expect(fmtU(1500, 'tokens')).toBe('1.5K tokens');
  });
});
