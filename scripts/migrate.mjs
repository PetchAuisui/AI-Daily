// สร้างตารางในฐานข้อมูลจาก db/schema.sql — ใช้: npm run db:migrate
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// โหลด .env.local / .env ถ้ามี (ตอน deploy ใช้ env ของแพลตฟอร์ม)
for (const f of ['.env.local', '.env']) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined,
});
await client.connect();
await client.query(fs.readFileSync(path.join(import.meta.dirname, '..', 'db', 'schema.sql'), 'utf8'));
await client.end();
console.log('Migration complete');
