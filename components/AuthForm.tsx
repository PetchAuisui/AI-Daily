'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

const PROVIDER_LABEL = { google: 'Google', github: 'GitHub' } as const;
type Provider = keyof typeof PROVIDER_LABEL;

function ProviderIcon({ p }: { p: Provider }) {
  return p === 'google' ? (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.2-3.1-.1-.4-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.6.3 2.8.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
    </svg>
  );
}

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
