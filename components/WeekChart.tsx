import type { Budget } from '@/lib/budget';
import { DOW_TH, dateTH, fmt, fmtU } from '@/lib/format';

const W = 700, H = 230, PL = 44, PR = 12, PT = 14, PB = 40;

export default function WeekChart({ c, unit }: { c: Budget; unit: string }) {
  const iw = W - PL - PR, ih = H - PT - PB;
  const raw = Math.max(...c.perDay, ...c.plan, c.baseDaily) * 1.1 || 1;
  const mag = 10 ** Math.floor(Math.log10(raw / 4));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v * 4 >= raw)!;
  const max = step * 4;
  const y = (v: number) => PT + ih - (v / max) * ih;
  const bw = iw / 7;
  const barW = bw * 0.56;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="กราฟการใช้รายวัน">
        {[0, 1, 2, 3, 4].map((g) => (
          <g key={g}>
            <line x1={PL} x2={W - PR} y1={y(step * g)} y2={y(step * g)} stroke="var(--border)" />
            <text x={PL - 6} y={y(step * g) + 4} textAnchor="end">{fmt(step * g, unit)}</text>
          </g>
        ))}
        {c.slices.map((s, i) => {
          const x = PL + i * bw;
          const v = c.perDay[i];
          const p = c.plan[i];
          const over = p > 0 ? v > p + 1e-9 : v > 0;
          const isToday = c.isCurrent && i === c.todayIdx;
          const bx = x + (bw - barW) / 2;
          return (
            <g key={i}>
              {isToday && <rect x={x + 2} y={PT} width={bw - 4} height={ih} rx={8} fill="var(--surface-2)" />}
              {v > 0 && (
                <>
                  <rect x={bx} y={y(v)} width={barW} height={Math.max(1, PT + ih - y(v))} rx={5} fill={over ? 'var(--over)' : 'var(--bar)'}>
                    <title>{`${dateTH(s.start)}: ${fmtU(v, unit)}`}</title>
                  </rect>
                  <text x={bx + barW / 2} y={y(v) - 5} textAnchor="middle">{fmt(v, unit)}</text>
                </>
              )}
              {p > 0 && (
                <line x1={x + bw * 0.12} x2={x + bw * 0.88} y1={y(p)} y2={y(p)} stroke="var(--text)" strokeWidth={2}
                  strokeDasharray={c.isCurrent && i > c.todayIdx ? '4 3' : undefined} />
              )}
              <text x={x + bw / 2} y={H - PB + 18} textAnchor="middle" className={isToday ? 'today-label' : undefined}>
                {DOW_TH[s.start.getDay()]} {s.start.getDate()}
              </text>
              <text x={x + bw / 2} y={H - PB + 33} textAnchor="middle">{isToday ? 'วันนี้' : c.active[i] ? '' : 'พัก'}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
