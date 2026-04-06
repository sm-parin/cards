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
  const [nickname, setNickname] = useState('');
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
        : await apiRegister(email.trim(), password, nickname.trim() || undefined);
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-8 text-center">Cards</h1>

        {/* Tabs */}
        <div className="flex border border-gray-800 rounded-lg overflow-hidden mb-6">
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors capitalize
                ${tab === t
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-300'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg
                         px-3 py-2 text-white text-sm focus:outline-none
                         focus:border-gray-600"
              autoComplete="email"
              required
            />
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Nickname <span className="text-gray-600">(optional)</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={32}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg
                           px-3 py-2 text-white text-sm focus:outline-none
                           focus:border-gray-600"
                autoComplete="nickname"
                placeholder="Visible to other players"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg
                         px-3 py-2 text-white text-sm focus:outline-none
                         focus:border-gray-600"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              required
            />
            {/* Password criteria — shown only on register when password has content */}
            {tab === 'register' && password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PW_CRITERIA.map(c => (
                  <li key={c.label} className="flex items-center gap-2 text-xs">
                    <span style={{ color: c.test(password) ? '#22c55e' : '#6b7280' }}>
                      {c.test(password) ? '✓' : '○'}
                    </span>
                    <span style={{ color: c.test(password) ? '#22c55e' : '#6b7280' }}>
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg
                           px-3 py-2 text-white text-sm focus:outline-none
                           focus:border-gray-600"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-white text-gray-950 rounded-lg py-2 text-sm
                       font-medium hover:bg-gray-100 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '...' : tab === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
