// ตัวละคร SVG ออกแบบเอง — สีตายตัว อ่านได้ทั้ง light/dark
import { PALETTE, SPECIES_TH, parseMascot, type Mood } from '@/lib/mascots';

const INK = '#2a2622';
const BLUSH = '#f28b8b';

type Props = { id: string; mood?: Mood; size?: number; title?: string };

export default function Mascot({ id, mood = 'happy', size = 64, title }: Props) {
  const { species, color } = parseMascot(id);
  const p = PALETTE[color];
  const F = (fx: number, fy: number, gap = 8, mouth = true) => <Face x={fx} y={fy} gap={gap} mood={mood} mouth={mouth} />;
  let body: React.ReactNode;

  switch (species) {
    case 'blob':
      body = (
        <>
          <path d="M32 12v-6" stroke={p.shade} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 7c3-5 9-5 11-3-2 4-7 5-11 3z" fill={p.shade} />
          <path d="M32 12c14 0 24 14 24 27 0 12-10 19-24 19S8 51 8 39c0-13 10-27 24-27z" fill={p.body} stroke={p.shade} strokeWidth="2" />
          <ellipse cx="32" cy="48" rx="13" ry="7" fill={p.belly} opacity=".8" />
          {F(32, 34)}
        </>
      );
      break;
    case 'bot':
      body = (
        <>
          <path d="M32 16V8" stroke={p.shade} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="7" r="3.5" fill={p.belly} stroke={p.shade} strokeWidth="2" />
          <rect x="4" y="30" width="6" height="12" rx="3" fill={p.shade} />
          <rect x="54" y="30" width="6" height="12" rx="3" fill={p.shade} />
          <rect x="9" y="16" width="46" height="40" rx="11" fill={p.body} stroke={p.shade} strokeWidth="2" />
          <rect x="15" y="23" width="34" height="25" rx="7" fill={p.belly} />
          {F(32, 34, 8)}
        </>
      );
      break;
    case 'owl':
      body = (
        <>
          <path d="M13 24 15 7l11 10zM51 24 49 7 38 17z" fill={p.shade} />
          <ellipse cx="32" cy="38" rx="23" ry="21" fill={p.body} stroke={p.shade} strokeWidth="2" />
          <ellipse cx="32" cy="50" rx="12" ry="7" fill={p.belly} opacity=".6" />
          <circle cx="23" cy="33" r="9" fill={p.belly} />
          <circle cx="41" cy="33" r="9" fill={p.belly} />
          <path d="M29 41h6l-3 5z" fill="#f2a33a" stroke="#c9771a" strokeWidth="1" strokeLinejoin="round" />
          {F(32, 33, 9, false)}
        </>
      );
      break;
    case 'cat':
      body = (
        <>
          <path d="M11 30 13 7l17 14zM53 30 51 7 34 21z" fill={p.body} stroke={p.shade} strokeWidth="2" strokeLinejoin="round" />
          <path d="M15 24 16 13l8 7zM49 24 48 13l-8 7z" fill={p.belly} />
          <ellipse cx="32" cy="39" rx="24" ry="19" fill={p.body} stroke={p.shade} strokeWidth="2" />
          <ellipse cx="32" cy="46" rx="11" ry="7" fill={p.belly} />
          <path d="M8 42h9M9 47l8-2M56 42h-9M55 47l-8-2" stroke={p.shade} strokeWidth="1.5" strokeLinecap="round" />
          {F(32, 37)}
        </>
      );
      break;
    case 'pilot':
      body = (
        <>
          <circle cx="32" cy="37" r="22" fill={p.body} stroke={p.shade} strokeWidth="2" />
          <path d="M10 33c0-14 10-22 22-22s22 8 22 22c-6-4-14-6-22-6s-16 2-22 6z" fill={p.shade} />
          <rect x="11" y="24" width="42" height="5" rx="2.5" fill={INK} opacity=".7" />
          <circle cx="24" cy="25" r="6" fill={p.belly} stroke={INK} strokeWidth="2" />
          <circle cx="40" cy="25" r="6" fill={p.belly} stroke={INK} strokeWidth="2" />
          <path d="M21.5 23.5l3-2M37.5 23.5l3-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="32" cy="50" rx="12" ry="6" fill={p.belly} opacity=".7" />
          {F(32, 40)}
        </>
      );
      break;
  }

  return (
    <svg className="mascot" viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={title ?? SPECIES_TH[species]}>
      {title && <title>{title}</title>}
      {body}
    </svg>
  );
}

function Face({ x, y, gap, mood, mouth }: { x: number; y: number; gap: number; mood: Mood; mouth: boolean }) {
  const l = x - gap, r = x + gap, my = y + 8;
  const s = { stroke: INK, strokeWidth: 2.2, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <g>
      {mood === 'happy' && (
        <>
          <ellipse cx={l} cy={y} rx="2.6" ry="3.2" fill={INK} />
          <ellipse cx={r} cy={y} rx="2.6" ry="3.2" fill={INK} />
          <circle cx={l + 0.9} cy={y - 1.2} r="0.9" fill="#fff" />
          <circle cx={r + 0.9} cy={y - 1.2} r="0.9" fill="#fff" />
          <circle cx={l - 4} cy={y + 5} r="2.6" fill={BLUSH} opacity=".55" />
          <circle cx={r + 4} cy={y + 5} r="2.6" fill={BLUSH} opacity=".55" />
          {mouth && <path d={`M${x - 4} ${my - 1}q4 4 8 0`} {...s} />}
        </>
      )}
      {mood === 'worried' && (
        <>
          <circle cx={l} cy={y} r="2.3" fill={INK} />
          <circle cx={r} cy={y} r="2.3" fill={INK} />
          <path d={`M${l - 3} ${y - 6}l5 2M${r + 3} ${y - 6}l-5 2`} {...s} strokeWidth={1.8} />
          {mouth && <path d={`M${x - 5} ${my}q1.7-2 3.3 0t3.3 0t3.4 0`} {...s} strokeWidth={1.8} />}
          <path d={`M${r + 8} ${y - 8}q2 3 0 4.5q-2-1.5 0-4.5z`} fill="#7cc4f2" />
        </>
      )}
      {mood === 'dizzy' && (
        <>
          <path d={`M${l - 2.5} ${y - 2.5}l5 5M${l + 2.5} ${y - 2.5}l-5 5M${r - 2.5} ${y - 2.5}l5 5M${r + 2.5} ${y - 2.5}l-5 5`} {...s} />
          {mouth && <ellipse cx={x} cy={my} rx="2.6" ry="3" fill={INK} />}
        </>
      )}
      {mood === 'sleepy' && (
        <>
          <path d={`M${l - 3} ${y}q3 2.5 6 0M${r - 3} ${y}q3 2.5 6 0`} {...s} />
          {mouth && <path d={`M${x - 2} ${my}h4`} {...s} />}
          <text x={r + 8} y={y - 8} fontSize="9" fontWeight="700" fill={INK} opacity=".55" fontFamily="system-ui, sans-serif">z</text>
        </>
      )}
    </g>
  );
}
