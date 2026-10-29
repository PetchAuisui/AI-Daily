# AI Daily

Web app สำหรับติดตามการใช้ weekly token/quota ของ AI แต่ละตัว แล้วบอกว่าวันนี้ควรใช้เท่าไหร่
**Stack:** Next.js 16 (App Router) + PostgreSQL (`pg`)

## รันบนเครื่อง

```bash
cp .env.example .env.local   # แก้ DATABASE_URL ให้ชี้ไปที่ Postgres
npm install
npm run db:migrate           # สร้างตาราง (รันซ้ำได้)
npm run dev                  # http://localhost:3000
```

## Deploy (Vercel + Neon, ฟรี)

`npm run build` จะรัน migration ให้อัตโนมัติถ้ามี `DATABASE_URL` (ไม่มีก็ข้าม) จึงไม่ต้องสร้างตารางเอง

1. ไปที่ [vercel.com/new](https://vercel.com/new) → Import repo `AI-Daily` → กด **Deploy**
   (ครั้งแรกจะยังใช้ไม่ได้เพราะยังไม่มี DB — ปกติ)
2. ในโปรเจกต์ Vercel → แท็บ **Storage** → **Create Database** → เลือก **Neon (Postgres)** → Connect กับโปรเจกต์นี้
   Vercel จะตั้ง `DATABASE_URL` / `POSTGRES_URL` ให้เอง
3. แท็บ **Deployments** → เมนู ⋯ ของ deploy ล่าสุด → **Redeploy** → build จะสร้างตารางแล้วแอปพร้อมใช้

หลังจากนี้ทุกครั้งที่ `git push` ขึ้น `main` Vercel จะ deploy ให้อัตโนมัติ

ใช้ DB เจ้าอื่น (Supabase / Railway / Neon โดยตรง) ก็ได้ แค่ตั้ง `DATABASE_URL` เอง — บน serverless แนะนำ **pooled** URL
แพลตฟอร์มที่รัน Node ได้ (Railway, Render, Fly.io, VPS) ใช้ `npm run build && npm start` ได้เลย

| Env | ความหมาย |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (จำเป็น, หรือใช้ `POSTGRES_URL` แทนได้) |
| `PGSSL=require` | บังคับ SSL แบบไม่ verify cert (ใช้เมื่อ provider ไม่รองรับ `?sslmode=require`) |
| `PG_POOL_MAX` | จำนวน connection สูงสุดต่อ instance (ค่าเริ่มต้น 5) |

## โครงสร้าง

```
app/
  page.tsx, login/page.tsx     หน้า dashboard / login (server components ตรวจ session)
  api/auth/*                   register, login, logout (session cookie + scrypt)
  api/trackers/*, api/usage/*  CRUD ของ AI ที่ติดตามและการใช้
components/                    Dashboard, UsageForm, TrackerDialog, WeekChart (client)
lib/budget.ts                  สูตรคำนวณงบ + คำแนะนำ (ทำใน browser ตาม timezone ผู้ใช้)
lib/db.ts, lib/auth.ts         Postgres pool, session
db/schema.sql                  schema
```

## หลักการคำนวณ

- **สัปดาห์** เริ่มที่วัน/เวลารีเซ็ตที่ตั้งไว้ แบ่งเป็น 7 วัน วันละ 24 ชม.
- **ใช้ได้จริง** = โควต้า − สำรอง (%)
- **งบปกติต่อวัน** = ใช้ได้จริง ÷ จำนวนวันใช้งาน
- **งบวันนี้** = (ใช้ได้จริง − ที่ใช้ไปก่อนวันนี้) ÷ วันใช้งานที่เหลือรวมวันนี้
- **งบวันถัดไป** = (ใช้ได้จริง − ที่ใช้ไปทั้งหมด) ÷ วันใช้งานที่เหลือหลังวันนี้ → วันไหนใช้หนักจะเห็นทันทีว่าต้องลดเท่าไหร่
- **คาดการณ์วันหมด** จากค่าเฉลี่ยการใช้ต่อวันใช้งานที่ผ่านมา

## บันทึกการใช้ 2 แบบ

1. **+ เพิ่มที่ใช้ไป** — ใส่จำนวนที่เพิ่งใช้
2. **ยอดรวมสัปดาห์ตอนนี้** — ใส่ตัวเลขที่เห็นในหน้า Usage (เช่น Claude แสดง 42%) ระบบจะบันทึกส่วนต่างให้เอง
