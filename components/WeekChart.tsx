import type { Budget } from '@/lib/budget';
import { DOW_TH, dateTH, fmt, fmtU } from '@/lib/format';

const W = 700, H = 230, PL = 44, PR = 12, PT = 14, PB = 40;

// กราฟยอดสะสมในรอบนี้ — แกน Y สุดที่โควต้าเต็ม (L) เริ่มใหม่ทุกครั้งที่รีเซ็ต
export default function WeekChart({ c, unit }: { c: Budget; unit: string }) {
  const iw = W - PL - PR, ih = H - PT - PB;
  const cum = c.perDay.map((_, i) => c.perDay.slice(0, i + 1).reduce((a, b) => a + b, 0));
  // เส้น pace: งบตั้งต้นสะสมตามวันใช้งาน จบที่ usable (โควต้าหักสำรอง)
  const cumPlan = c.active.map((_, i) => c.baseDaily * c.active.slice(0, i + 1).filter(Boolean).length);
  // ปกติสุดที่ 100% ของโควต้า; ถ้าใช้เกินก็ขยายทีละ 25%
  const step = c.L / 4;
  const ticks = Math.max(4, Math.ceil(cum[6] / step));
  const max = step * ticks;
  const y = (v: number) => PT + ih - (v / max) * ih;
  const bw = iw / 7;
  const barW = bw * 0.56;
  const shown = c.isCurrent ? c.todayIdx : c.todayIdx === 7 ? 6 : -1; // วันสุดท้ายที่มีข้อมูลจริง

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="กราฟยอดใช้สะสมในรอบนี้">
        {Array.from({ length: ticks + 1 }, (_, g) => (
          <g key={g}>
            <line x1={PL} x2={W - PR} y1={y(step * g)} y2={y(step * g)} stroke="var(--border)" />
            <text x={PL - 6} y={y(step * g) + 4} textAnchor="end">{fmt(step * g, unit)}</text>
          </g>
        ))}
        {c.slices.map((s, i) => {
          const x = PL + i * bw;
          const v = c.perDay[i];
          const total = cum[i];
          const before = total - v;
          const over = total > cumPlan[i] + 1e-9;
          const isToday = c.isCurrent && i === c.todayIdx;
          const bx = x + (bw - barW) / 2;
          const future = i > shown;
          return (
            <g key={i}>
              {isToday && <rect x={x + 2} y={PT} width={bw - 4} height={ih} rx={8} fill="var(--surface-2)" />}
              {!future && total > 0 && (
                <>
                  <title>{`${dateTH(s.start)}: ใช้ ${fmtU(v, unit)} · สะสม ${fmtU(total, unit)} / ${fmtU(c.L, unit)}`}</title>
                  {before > 0 && (
                    <rect x={bx} y={y(before)} width={barW} height={PT + ih - y(before)} rx={5} fill="var(--bar)" opacity={0.35} />
                  )}
                  {v > 0 && (
                    <rect x={bx} y={y(total)} width={barW} height={Math.max(1, y(before) - y(total))} rx={5}
                      fill={over ? 'var(--over)' : 'var(--bar)'} />
                  )}
                  <text x={bx + barW / 2} y={y(total) - 5} textAnchor="middle">{fmt(total, unit)}</text>
                </>
              )}
              {cumPlan[i] > 0 && (
                <line x1={x + bw * 0.12} x2={x + bw * 0.88} y1={y(cumPlan[i])} y2={y(cumPlan[i])} stroke="var(--text)" strokeWidth={2}
                  strokeDasharray={future ? '4 3' : undefined} />
              )}
              <text x={x + bw / 2} y={H - PB + 18} textAnchor="middle" className={isToday ? 'today-label' : undefined}>
                {DOW_TH[s.start.getDay()]} {s.start.getDate()}
              </text>
              <text x={x + bw / 2} y={H - PB + 33} textAnchor="middle">{isToday ? 'วันนี้' : c.active[i] ? '' : 'พัก'}</text>
            </g>
          );
        })}
        <line x1={PL} x2={W - PR} y1={y(c.L)} y2={y(c.L)} stroke="var(--over)" strokeWidth={1.5} strokeDasharray="6 4" />
        <text x={W - PR} y={y(c.L) - 5} textAnchor="end" style={{ fill: 'var(--over)' }}>เพดาน {fmt(c.L, unit)}</text>
      </svg>
    </div>
  );
}
