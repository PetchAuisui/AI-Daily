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

## Deploy (ตัวอย่าง: Vercel + Neon)

1. สร้างฐานข้อมูล Postgres ฟรีที่ [Neon](https://neon.tech) (หรือ Supabase / Railway / Vercel Postgres) แล้วคัดลอก connection string
   — บน serverless แนะนำใช้ **pooled** URL (Neon: host ที่มี `-pooler`)
2. รัน migration ครั้งเดียวจากเครื่อง:
   ```bash
   DATABASE_URL="postgres://...?sslmode=require" npm run db:migrate
   ```
3. Push โค้ดขึ้น GitHub → Import โปรเจกต์ใน Vercel → ตั้ง Environment Variable `DATABASE_URL` → Deploy

แพลตฟอร์มที่รัน Node ได้ (Railway, Render, Fly.io, VPS) ใช้ `npm run build && npm start` ได้เลย

| Env | ความหมาย |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (จำเป็น) |
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
