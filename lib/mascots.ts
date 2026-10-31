// ตัวละครประจำ AI แต่ละตัว — id = `${species}-${color}` (ใช้ได้ทั้งฝั่ง server และ client)
export const SPECIES = ['blob', 'bot', 'owl', 'cat', 'pilot'] as const;
export const COLORS = ['coral', 'green', 'blue', 'purple', 'gold'] as const;
export type Species = (typeof SPECIES)[number];
export type MascotColor = (typeof COLORS)[number];
export type Mood = 'happy' | 'worried' | 'dizzy' | 'sleepy';

export const SPECIES_TH: Record<Species, string> = { blob: 'ก้อนนุ่ม', bot: 'หุ่นจิ๋ว', owl: 'นกฮูก', cat: 'แมวเหมียว', pilot: 'นักบิน' };
export const COLOR_TH: Record<MascotColor, string> = { coral: 'ส้มอิฐ', green: 'เขียว', blue: 'ฟ้า', purple: 'ม่วง', gold: 'ทอง' };

/** body = สีหลัก, shade = เงา/ขอบ, belly = ส่วนสว่าง */
export const PALETTE: Record<MascotColor, { body: string; shade: string; belly: string }> = {
  coral: { body: '#e08a6a', shade: '#b8603f', belly: '#f7d2c2' },
  green: { body: '#4fb48a', shade: '#2f8763', belly: '#cdeedd' },
  blue: { body: '#5b8def', shade: '#3a64c0', belly: '#d3e1fb' },
  purple: { body: '#9a7be0', shade: '#7052b8', belly: '#e3d9f7' },
  gold: { body: '#e3b341', shade: '#b4861c', belly: '#f8e8b8' },
};

export const MASCOT_IDS: string[] = SPECIES.flatMap((s) => COLORS.map((c) => `${s}-${c}`));
export const isMascotId = (v: unknown): v is string => typeof v === 'string' && MASCOT_IDS.includes(v);

export function parseMascot(id: string): { species: Species; color: MascotColor } {
  const [s, c] = id.split('-') as [Species, MascotColor];
  return { species: s, color: c };
}

// ชื่อที่มีคำเหล่านี้ได้ตัวละครธีมเฉพาะ (ตัวละครออกแบบเอง ไม่ใช่โลโก้แบรนด์)
const THEMES: [RegExp, string][] = [
  [/claude/i, 'blob-coral'],
  [/chat\s*gpt|gpt|openai/i, 'owl-green'],
  [/gemini/i, 'cat-purple'],
  [/copilot/i, 'pilot-blue'],
  [/cursor/i, 'bot-gold'],
];

/** ตัวละครที่ใช้แสดง: ที่ผู้ใช้เลือกไว้ ถ้าไม่มีก็เลือกจากชื่อ แล้วค่อยสุ่มแบบคงที่จาก id */
export function mascotFor(t: { id?: number; name: string; mascot?: string | null }): string {
  if (isMascotId(t.mascot)) return t.mascot;
  for (const [re, id] of THEMES) if (re.test(t.name)) return id;
  const n = t.id ?? [...t.name].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return MASCOT_IDS[(n * 7) % MASCOT_IDS.length];
}
