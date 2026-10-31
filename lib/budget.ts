// การคำนวณงบรายวัน — ทำฝั่ง browser ตาม timezone ของผู้ใช้
import { dateTH, fmtU, timeTH } from './format';
import type { Tracker, UsageEntry } from './types';

const DAY_MS = 864e5;

export type Slice = { start: Date; end: Date };
export type Status = 'ok' | 'warn' | 'over' | 'off';
export type Tone = 'ok' | 'warn' | 'over';
/** ข้อความคำแนะนำ: string ธรรมดา หรือ { b } = ตัวหนา */
export type Tip = Array<string | { b: string }>;
export type Advice = { face: string; title: string; tips: Tip[]; tone: Tone };

// สัปดาห์เริ่มที่ reset_dow + reset_hour ล่าสุดที่ผ่านมา, แบ่งช่วงตามวันในปฏิทิน (ตัดเที่ยงคืน)
// ถ้ารีเซ็ตไม่ใช่เที่ยงคืน วันรีเซ็ตจะถูกแบ่งเป็น 2 ช่วง: หลังรีเซ็ต (แท่งแรก) และก่อนรีเซ็ต (แท่งสุดท้าย) → 8 แท่ง
export function weekStartFor(t: Pick<Tracker, 'reset_dow' | 'reset_hour'>, now = new Date()) {
  const d = new Date(now);
  d.setHours(t.reset_hour, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - t.reset_dow + 7) % 7));
  if (d > now) d.setDate(d.getDate() - 7);
  return d;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n); // setDate รองรับ DST ได้ดีกว่าบวก ms ตรงๆ
  return x;
}

function slicesOf(start: Date): Slice[] {
  const end = addDays(start, 7);
  const cuts = [start];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 7; i++) {
    const midnight = addDays(d, i);
    if (midnight > start && midnight < end) cuts.push(midnight);
  }
  cuts.push(end);
  return cuts.slice(0, -1).map((s, i) => ({ start: s, end: cuts[i + 1] }));
}

export function compute(t: Tracker, entries: UsageEntry[], weekStart: Date, now: Date) {
  const slices = slicesOf(weekStart);
  const n = slices.length;
  const weekEnd = slices[n - 1].end;
  const active = slices.map((s) => t.active_days[s.start.getDay()] === '1');
  // น้ำหนักงบของแต่ละช่วง = ความยาวเป็นวัน (ช่วงไม่เต็มวันได้งบตามสัดส่วน), วันพัก = 0
  const weight = slices.map((s, i) => (active[i] ? (+s.end - +s.start) / DAY_MS : 0));
  const wSum = (from: number, to = n) => weight.slice(Math.max(0, from), to).reduce((a, b) => a + b, 0);
  const perDay = slices.map((s) => entries.filter((e) => e.ts >= +s.start && e.ts < +s.end).reduce((a, e) => a + e.amount, 0));

  const L = t.weekly_limit;
  const reserve = L * (t.reserve_pct / 100);
  const usable = L - reserve;
  const activeCount = [...t.active_days].filter((c) => c === '1').length;
  const baseDaily = usable / wSum(0);
  const used = perDay.reduce((a, b) => a + b, 0);
  const remaining = L - used;

  const isCurrent = now >= weekStart && now < weekEnd;
  const todayIdx = isCurrent ? slices.findIndex((s) => now >= s.start && now < s.end) : now >= weekEnd ? n : -1;

  // แผนงบรายวัน: วันที่ผ่านไปแล้วใช้ baseDaily, วันนี้/อนาคตปรับตามที่เหลือจริง
  const usedBefore = perDay.slice(0, Math.max(0, todayIdx)).reduce((a, b) => a + b, 0);
  const activeAfterToday = active.filter((a, i) => a && i > todayIdx).length;
  const usedToday = todayIdx >= 0 && todayIdx < n ? perDay[todayIdx] : 0;
  const todayActive = todayIdx >= 0 && todayIdx < n && active[todayIdx];

  // todayBudget = งบของช่วงวันนี้ทั้งช่วง; nextDaily = งบต่อ "วันเต็ม" สำหรับวันถัดไป
  const todayBudget = todayActive ? (Math.max(0, usable - usedBefore) * weight[todayIdx]) / wSum(todayIdx) : 0;
  const nextDaily = activeAfterToday > 0 ? Math.max(0, usable - used) / wSum(todayIdx + 1) : 0;
  const todayFrac = todayActive ? (+now - +slices[todayIdx].start) / (+slices[todayIdx].end - +slices[todayIdx].start) : 0;

  // pace: ควรใช้ไปเท่าไหร่แล้ว ณ ตอนนี้ (ตามแผนตั้งต้น)
  let expected = 0;
  if (isCurrent) {
    expected = baseDaily * (wSum(0, todayIdx) + weight[todayIdx] * todayFrac);
  } else if (todayIdx === n) expected = usable;

  // คาดการณ์วันหมด จากค่าเฉลี่ยต่อวันใช้งานที่ผ่านมา (รวมวันนี้)
  let runOut: Date | null = null;
  if (isCurrent && used > 0 && remaining > 0) {
    const elapsedActive = wSum(0, todayIdx) + weight[todayIdx] * todayFrac;
    const rate = elapsedActive > 0 ? used / elapsedActive : 0;
    let left = remaining;
    for (let i = todayIdx; rate > 0 && i < n; i++) {
      const cap = i === todayIdx ? weight[i] * (1 - todayFrac) : weight[i];
      const burn = rate * cap;
      if (burn > 0 && burn >= left) {
        runOut = new Date(+(i === todayIdx ? now : slices[i].start) + (left / rate) * DAY_MS);
        break;
      }
      left -= burn;
    }
  }

  const hoursLeftToday = todayActive ? (+slices[todayIdx].end - +now) / 36e5 : 0;

  // งบรายวันสำหรับกราฟ
  const plan = slices.map((_, i) => {
    if (!active[i]) return 0;
    if (!isCurrent || i < todayIdx) return baseDaily * weight[i];
    return i === todayIdx ? todayBudget : nextDaily * weight[i];
  });

  return {
    slices, active, weight, perDay, plan, L, reserve, usable, activeCount, baseDaily, used, remaining,
    isCurrent, todayIdx, usedToday, todayActive, todayBudget, nextDaily, activeAfterToday,
    expected, runOut, hoursLeftToday, weekEnd,
  };
}

export type Budget = ReturnType<typeof compute>;

export function statusOf(c: Budget): Status {
  if (c.remaining <= 0) return 'over';
  if (!c.todayActive) return 'off';
  const r = c.todayBudget > 0 ? c.usedToday / c.todayBudget : c.usedToday > 0 ? 2 : 0;
  if (r >= 1) return 'over';
  if (r >= 0.75) return 'warn';
  return 'ok';
}

export function buddyAdvice(t: Tracker, c: Budget): Advice {
  const u = t.unit;
  const tips: Tip[] = [];

  if (!c.isCurrent) {
    const over = c.used > c.L;
    if (c.todayIdx !== c.slices.length) return { face: '🗓️', title: 'สัปดาห์นี้ยังไม่เริ่ม', tips, tone: 'ok' };
    const heavy = c.perDay.reduce((m, v, i) => (v > c.perDay[m] ? i : m), 0);
    if (c.used > 0) tips.push([`วันที่ใช้หนักสุดคือ ${dateTH(c.slices[heavy].start)} (${fmtU(c.perDay[heavy], u)})`]);
    tips.push([over ? 'สัปดาห์นี้เกินโควต้า ลองเพิ่ม % สำรองหรือลดงานหนักในวันแรกๆ' : 'คุมได้ดีมาก ✌️']);
    return {
      face: over ? '😵' : '🎉',
      title: `สัปดาห์นี้ใช้ไป ${fmtU(c.used, u)} จาก ${fmtU(c.L, u)} (${Math.round((c.used / c.L) * 100)}%)`,
      tips,
      tone: over ? 'over' : 'ok',
    };
  }

  const st = statusOf(c);
  let face: string, title: string, tone: Tone;
  const leftToday = c.todayBudget - c.usedToday;

  if (c.remaining <= 0) {
    face = '😵'; tone = 'over';
    title = 'โควต้าสัปดาห์นี้หมดแล้ว';
    tips.push([`รีเซ็ตรอบถัดไป ${dateTH(c.weekEnd)} ${timeTH(c.weekEnd)}`]);
    tips.push(['ระหว่างนี้ใช้ AI ตัวอื่นหรือรุ่นที่เล็กกว่าไปก่อน']);
  } else if (st === 'off') {
    face = '😴'; tone = 'ok';
    title = 'วันนี้เป็นวันพัก ไม่ได้แบ่งงบไว้';
    if (c.usedToday > 0) tips.push([`วันพักแต่ใช้ไป ${fmtU(c.usedToday, u)} — หักจากงบวันถัดไปแล้ว`]);
    tips.push([`วันใช้งานถัดไปมีงบ ~${fmtU(c.nextDaily, u)}/วัน`]);
  } else if (st === 'over') {
    face = '🔥'; tone = 'over';
    title = `วันนี้ใช้หนักไปแล้ว เกินงบ ${fmtU(-leftToday, u)}`;
    if (c.activeAfterToday > 0) {
      tips.push([`ถ้าหยุดตอนนี้ วันที่เหลือ (${c.activeAfterToday} วัน) ใช้ได้ ~`, { b: `${fmtU(c.nextDaily, u)}/วัน` }, ` (ปกติ ${fmtU(c.baseDaily, u)})`]);
    } else {
      tips.push(['วันนี้เป็นวันใช้งานสุดท้ายของสัปดาห์ เหลือแค่ส่วนสำรองแล้ว']);
    }
    if (c.used > c.usable) tips.push([`เริ่มกินส่วนสำรองแล้ว (สำรองเหลือ ${fmtU(Math.max(0, c.remaining), u)})`]);
    tips.push(['ลดการใช้: เปิดแชทใหม่แทนแชทยาว, ใช้รุ่นเล็กกับงานง่าย, สรุปบริบทก่อนส่ง, หลีกเลี่ยงแนบไฟล์ใหญ่ซ้ำ']);
  } else if (st === 'warn') {
    face = '😬'; tone = 'warn';
    title = `ใกล้ครบงบวันนี้แล้ว เหลืออีก ${fmtU(leftToday, u)}`;
    if (c.hoursLeftToday > 0.5) tips.push([`เหลือเวลาอีก ${c.hoursLeftToday.toFixed(1)} ชม. → ~${fmtU(leftToday / c.hoursLeftToday, u)}/ชม.`]);
    tips.push(['เก็บงานหนักไว้พรุ่งนี้ วันนี้ใช้กับงานสั้นๆ พอ']);
  } else {
    face = '😊'; tone = 'ok';
    title = `วันนี้ใช้ได้อีก ${fmtU(leftToday, u)} สบายๆ`;
    if (c.hoursLeftToday > 0.5) tips.push([`เหลือเวลาอีก ${c.hoursLeftToday.toFixed(1)} ชม. → ใช้ได้ ~${fmtU(leftToday / c.hoursLeftToday, u)}/ชม.`]);
  }

  if (c.remaining > 0) {
    const diffPace = c.used - c.expected;
    if (diffPace > c.baseDaily * 0.25) tips.push([`เร็วกว่าแผน ${fmtU(diffPace, u)} — ค่อยๆ ผ่อนลงหน่อย`]);
    else if (diffPace < -c.baseDaily * 0.5) tips.push([`ช้ากว่าแผน ${fmtU(-diffPace, u)} — มีเหลือเฟือ ใช้งานหนักได้ถ้าจำเป็น`]);
    if (c.runOut && c.runOut < c.weekEnd) {
      tips.push(['⚠️ ถ้าใช้เรทนี้ต่อ จะหมดประมาณ ', { b: `${dateTH(c.runOut)} ${timeTH(c.runOut)}` }, ' (ก่อนรีเซ็ต)']);
      if (tone === 'ok') tone = 'warn';
    }
  }
  return { face, title, tips, tone };
}
