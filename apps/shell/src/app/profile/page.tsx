'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@cards/auth';
import { useAuth } from '../../context/AuthContext';
import { AvatarCircle } from '@cards/ui';

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, loading, login } = useAuth();

  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname ?? '');
      setBio(user.bio ?? '');
    }
  }, [user]);

  if (loading || !user) return null;

  const previewName = nickname.trim() || user.email?.split('@')[0] || user.username;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setSaving(true);
    try {
      const result = await updateProfile(token, {
        nickname: nickname.trim() || null,
        bio: bio.trim() || null,
      });
      login(result.token, result.user);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-14">
      {/* Header */}
      <h1
        className="text-3xl font-bold tracking-tight mb-10"
        style={{ color: 'var(--color-fg)' }}
      >
        Profile
      </h1>

      {/* Avatar + identity card */}
      <div
        className="rounded-2xl p-6 flex items-center gap-5 mb-8 border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <AvatarCircle userId={user.id} displayName={previewName} size={64} />
        <div>
          <p className="font-semibold text-base" style={{ color: 'var(--color-fg)' }}>{previewName}</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{user.email}</p>
        </div>
      </div>

      {/* Form */}
      <div
        className="rounded-2xl p-7 border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <form onSubmit={handleSave} className="space-y-5">
          {/* Read-only email */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-fg-muted)' }}>
              Email
            </label>
            <input
              type="email"
              value={user.email ?? ''}
              readOnly
              tabIndex={-1}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm cursor-not-allowed"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-fg-subtle)',
                opacity: 0.7,
              }}
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-fg-muted)' }}>
              Nickname <span style={{ color: 'var(--color-fg-subtle)' }}>— visible to others</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={32}
              placeholder={user.email?.split('@')[0] ?? user.username}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm transition-all"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-fg)',
                outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-brand) 15%, transparent)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-fg-muted)' }}>
              Bio
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Say something about yourself…"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm resize-none transition-all"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-fg)',
                outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-brand)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-brand) 15%, transparent)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
            />
            <p className="text-xs text-right mt-1" style={{ color: 'var(--color-fg-subtle)' }}>{bio.length}/280</p>
          </div>

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--color-danger-muted)', color: 'var(--color-danger)', border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)' }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-all"
              style={{ background: 'var(--color-surface-raised)', color: 'var(--color-fg-muted)', border: '1px solid var(--color-border)' }}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all"
              style={{
                background: 'var(--color-brand)',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.65 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
