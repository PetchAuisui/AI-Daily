'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError('');
    setBusy(true);
    try {
      await api(`/api/auth/${mode}`, {
        method: 'POST',
        body: { username: f.get('username'), password: f.get('password'), display_name: f.get('display_name') },
      });
      router.replace(mode === 'register' ? '/?new=1' : '/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="auth">
      <div className="auth-card">
        <div className="logo">🤖 AI Daily</div>
        <p className="muted">เพื่อนช่วยแบ่ง weekly token ให้พอใช้ทั้งสัปดาห์</p>
        <div className="tabs" role="tablist">
          {(['login', 'register'] as const).map((m) => (
            <button key={m} type="button" className={`tab ${mode === m ? 'active' : ''}`} onClick={() => { setMode(m); setError(''); }}>
              {m === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit}>
          {mode === 'register' && (
            <label>ชื่อที่แสดง
              <input name="display_name" autoComplete="nickname" placeholder="เช่น เพชร" />
            </label>
          )}
          <label>ชื่อผู้ใช้หรืออีเมล
            <input name="username" required autoComplete="username" placeholder="username หรือ email" />
          </label>
          <label>รหัสผ่าน
            <input name="password" type="password" required placeholder="อย่างน้อย 6 ตัว"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          <p className="error">{error}</p>
          <button className="btn primary full" type="submit" disabled={busy}>
            {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>
      </div>
    </section>
  );
}
