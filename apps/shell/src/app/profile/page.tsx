'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@cards/auth';
import { useAuth } from '../../context/AuthContext';
import AvatarCircle from '../../components/AvatarCircle';

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
    <>
      <main className="max-w-lg mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold mb-8">Profile settings</h2>

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-8">
          <AvatarCircle userId={user.id} displayName={previewName} size={72} />
          <div>
            <p className="text-white font-medium">{previewName}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Read-only email */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={user.email ?? ''}
              readOnly
              tabIndex={-1}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg
                         px-3 py-2 text-gray-500 text-sm cursor-not-allowed opacity-70
                         select-none"
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Nickname <span className="text-gray-600">(visible to other players)</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={32}
              placeholder={user.email?.split('@')[0] ?? user.username}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg
                         px-3 py-2 text-white text-sm focus:outline-none
                         focus:border-gray-600"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Say something about yourself..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg
                         px-3 py-2 text-white text-sm focus:outline-none
                         focus:border-gray-600 resize-none"
            />
            <p className="text-xs text-gray-600 mt-1 text-right">{bio.length}/280</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 bg-gray-800 text-gray-200 rounded-lg py-2 text-sm
                         font-medium hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-white text-gray-950 rounded-lg py-2 text-sm
                         font-medium hover:bg-gray-100 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
