'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login as apiLogin, register as apiRegister } from '@cards/auth';
import { useAuth } from '../../../context/AuthContext';

type Tab = 'login' | 'register';

const PW_CRITERIA = [
  { label: 'More than 6 characters', test: (p: string) => p.length > 6 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Contains a number', test: (p: string) => /[0-9]/.test(p) },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  const allCriteriaMet = PW_CRITERIA.every(c => c.test(password));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (tab === 'register') {
      if (!allCriteriaMet) {
        setError('Password does not meet all requirements');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = tab === 'login'
        ? await apiLogin(email.trim(), password)
        : await apiRegister(email.trim(), password);
      login(result.token, result.user);
      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-bold tracking-tight mb-1"
            style={{ color: 'var(--color-fg)' }}
          >
            Welcome back
          </h1>
          <p style={{ color: 'var(--color-fg-muted)', fontSize: '14px' }}>
            {tab === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7 border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {/* Tabs */}
          <div
            className="flex rounded-xl overflow-hidden mb-7 p-1"
            style={{ background: 'var(--color-surface-raised)' }}
          >
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className="flex-1 py-2 text-sm font-medium transition-all duration-150 rounded-lg capitalize"
                style={{
                  background: tab === t ? 'var(--color-bg)' : 'transparent',
                  color: tab === t ? 'var(--color-fg)' : 'var(--color-fg-muted)',
                  boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                }}
              >
                {t === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm transition-all"
                style={{
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-fg)',
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-brand) 15%, transparent)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm transition-all"
                style={{
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-fg)',
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-brand) 15%, transparent)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
              />
              {tab === 'register' && password.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {PW_CRITERIA.map(c => (
                    <li key={c.label} className="flex items-center gap-2 text-xs">
                      <span style={{ color: c.test(password) ? 'var(--color-success)' : 'var(--color-fg-subtle)', fontSize: '10px' }}>
                        {c.test(password) ? '●' : '○'}
                      </span>
                      <span style={{ color: c.test(password) ? 'var(--color-success)' : 'var(--color-fg-muted)' }}>
                        {c.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {tab === 'register' && (
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm transition-all"
                  style={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-fg)',
                    outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-brand) 15%, transparent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'var(--color-danger-muted)', color: 'var(--color-danger)', border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
              style={{
                background: submitting ? 'color-mix(in srgb, var(--color-brand) 70%, transparent)' : 'var(--color-brand)',
                color: '#fff',
                cursor: submitting ? 'not-allowed' : 'pointer',
                marginTop: '8px',
              }}
            >
              {submitting ? 'Please wait…' : tab === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
