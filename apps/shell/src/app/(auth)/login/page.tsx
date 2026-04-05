'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login as apiLogin, register as apiRegister } from '@cards/auth';
import { useAuth } from '../../../context/AuthContext';

type Tab = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();

  const [tab, setTab] = useState<Tab>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in → go to dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (tab === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const result = tab === 'login'
        ? await apiLogin(username.trim(), password)
        : await apiRegister(username.trim(), password);
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
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg
                         px-3 py-2 text-white text-sm focus:outline-none
                         focus:border-gray-600"
              autoComplete="username"
              required
            />
          </div>
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
          </div>
          {tab === 'register' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Confirm password
              </label>
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

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

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
