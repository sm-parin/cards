'use client';
import Link from 'next/link';
import { Button } from '@cards/ui';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { loading } = useAuth();

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4 text-white">Dream Cards</h1>
        <p className="text-xl text-gray-400 mb-12">Multiplayer card games, anytime.</p>
        <Link href="/explore">
          <Button variant="primary">Explore Games</Button>
        </Link>
      </div>
    </div>
  );
}
