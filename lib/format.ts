export const DOW_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
export const DOW_TH_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export const isPct = (unit: string) => unit.trim() === '%';

export function fmt(n: number, unit: string) {
  if (!Number.isFinite(n)) return '–';
  const pct = isPct(unit);
  const abs = Math.abs(n);
  let s: string;
  if (pct) s = abs >= 10 ? n.toFixed(0) : abs >= 1 || abs === 0 ? n.toFixed(1) : n.toFixed(2);
  else if (abs >= 1e9) s = (n / 1e9).toFixed(2) + 'B';
  else if (abs >= 1e6) s = (n / 1e6).toFixed(abs >= 1e7 ? 1 : 2) + 'M';
  else if (abs >= 1e3) s = (n / 1e3).toFixed(abs >= 1e4 ? 0 : 1) + 'K';
  else s = Math.round(n).toString();
  return pct ? s + '%' : s;
}

export const fmtU = (n: number, unit: string) => (isPct(unit) ? fmt(n, unit) : `${fmt(n, unit)} ${unit}`);
export const dateTH = (d: Date) => d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
export const timeTH = (d: Date) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

export function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
