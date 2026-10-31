'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import Logo from './Logo';
import { PROVIDER_LABEL, ProviderIcon, type Provider } from './ProviderIcon';

export default function AuthForm({ providers = [], initialError = '' }: { providers?: Provider[]; initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState(initialError);
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
        <div className="logo"><Logo /> AI Daily</div>
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
        {providers.length > 0 && (
          <>
            <div className="divider"><span>หรือ</span></div>
            <div className="oauth">
              {providers.map((p) => (
                <a key={p} className="btn full oauth-btn" href={`/api/auth/oauth/${p}`}>
                  <ProviderIcon p={p} />
                  ดำเนินการต่อด้วย {PROVIDER_LABEL[p]}
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
