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
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | เปิดปุ่ม "ดำเนินการต่อด้วย Google" (ไม่บังคับ) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | เปิดปุ่ม "ดำเนินการต่อด้วย GitHub" (ไม่บังคับ) |
| `APP_URL` | URL หลักของแอป ใช้สร้าง redirect URI (ไม่ตั้งก็ใช้ origin ของ request) |

## เข้าสู่ระบบด้วย Google / GitHub

ใช้ OAuth flow เล็ก ๆ ผ่านไลบรารี [`arctic`](https://arcticjs.dev) แล้วออก session cookie แบบเดียวกับการ login ด้วยรหัสผ่าน
บัญชี OAuth เก็บในตาราง `accounts` และผูกกับแถวใน `users` (ผู้ใช้ OAuth ไม่มีรหัสผ่าน) — ตั้งเฉพาะ provider ที่ต้องการ ปุ่มจะขึ้นเองเมื่อมี env ครบ

Redirect URI (ลงทะเบียนทั้งของเครื่องและของ Vercel):

```
http://localhost:3000/api/auth/oauth/google/callback
https://<โดเมน-vercel>/api/auth/oauth/google/callback
http://localhost:3000/api/auth/oauth/github/callback
https://<โดเมน-vercel>/api/auth/oauth/github/callback
```

- **Google:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create credentials → OAuth client ID → *Web application* → ใส่ Authorized redirect URIs ด้านบน
- **GitHub:** [Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) → New OAuth App → Authorization callback URL
  (GitHub OAuth App รับได้ callback เดียว — สร้างแยก app สำหรับ local กับ production)
- ใส่ค่าใน `.env.local` และใน Vercel → Settings → Environment Variables แล้ว redeploy

การผูกบัญชี: ระบบ**ไม่**ผูกด้วยอีเมลอัตโนมัติ (การสมัครด้วยรหัสผ่านไม่ได้ยืนยันอีเมล) — ครั้งแรกที่กด Google/GitHub จะสร้างผู้ใช้ใหม่
ถ้าต้องการผูกกับบัญชีรหัสผ่านเดิม ให้ login ด้วยรหัสผ่านก่อน แล้วเปิด `/api/auth/oauth/google` (หรือ `github`) บัญชีนั้นจะถูกผูกกับผู้ใช้ที่ login อยู่

## โครงสร้าง

```
app/
  page.tsx, login/page.tsx     หน้า dashboard / login (server components ตรวจ session)
  api/auth/*                   register, login, logout (session cookie + scrypt)
  api/auth/oauth/[provider]/*  เริ่ม/callback ของ Google, GitHub OAuth (arctic)
  api/trackers/*, api/usage/*  CRUD ของ AI ที่ติดตามและการใช้
components/                    Dashboard, UsageForm, TrackerDialog, WeekChart (client)
lib/budget.ts                  สูตรคำนวณงบ + คำแนะนำ (ทำใน browser ตาม timezone ผู้ใช้)
lib/db.ts, lib/auth.ts         Postgres pool, session
lib/oauth.ts                   OAuth providers + ผูกบัญชี
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
