'use client';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (!user) return null;

  return (
    <header className="border-b border-gray-800 px-6 py-4 flex items-center
                       justify-between">
      <span className="font-semibold text-white">Cards</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">{user.coins} coins</span>
        <span className="text-sm text-white">{user.username}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
