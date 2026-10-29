import 'server-only';
import { Pool, types, type QueryResultRow } from 'pg';

// BIGINT (epoch ms) → number แทน string
types.setTypeParser(20, (v) => Number(v));

// เก็บ pool ไว้ใน globalThis เพื่อไม่ให้สร้างใหม่ทุกครั้งที่ hot-reload / serverless warm start
const g = globalThis as unknown as { __pgPool?: Pool };

function getPool(): Pool {
  if (!g.__pgPool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    g.__pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PG_POOL_MAX) || 5,
    });
  }
  return g.__pgPool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
